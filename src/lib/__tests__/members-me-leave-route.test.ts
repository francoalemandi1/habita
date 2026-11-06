import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const {
  requireMemberMock,
  memberCountMock,
  assignmentFindManyMock,
  assignmentUpdateMock,
  assignmentUpdateManyMock,
  taskTransferUpdateManyMock,
  memberUpdateMock,
  memberFindManyMock,
  memberFindFirstMock,
  transactionMock,
  loadTaskPlannerSnapshotMock,
  scoreCandidatesMock,
  deliverNotificationToMembersMock,
} = vi.hoisted(() => ({
  requireMemberMock: vi.fn(),
  memberCountMock: vi.fn(),
  assignmentFindManyMock: vi.fn(),
  assignmentUpdateMock: vi.fn(),
  assignmentUpdateManyMock: vi.fn(),
  taskTransferUpdateManyMock: vi.fn(),
  memberUpdateMock: vi.fn(),
  memberFindManyMock: vi.fn(),
  memberFindFirstMock: vi.fn(),
  transactionMock: vi.fn(),
  loadTaskPlannerSnapshotMock: vi.fn(),
  scoreCandidatesMock: vi.fn(),
  deliverNotificationToMembersMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireMember: requireMemberMock }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assignment: { findMany: assignmentFindManyMock },
    member: { findMany: memberFindManyMock, findFirst: memberFindFirstMock },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/task-planner-context", () => ({
  loadTaskPlannerSnapshot: loadTaskPlannerSnapshotMock,
}));

vi.mock("@habita/domain", () => ({
  scoreCandidates: scoreCandidatesMock,
}));

vi.mock("@/lib/push-delivery", () => ({
  deliverNotificationToMembers: deliverNotificationToMembersMock,
}));

import { POST } from "@/app/api/members/me/leave/route";

function baseMember(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "member-1",
    userId: "user-1",
    name: "Sofi",
    memberType: "ADULT",
    householdId: "household-1",
    household: { name: "Casa Sofi", timezone: "America/Argentina/Buenos_Aires" },
    ...overrides,
  };
}

/** Routes tx.member.count's two calls (ADULT-only vs total active) by their `where` clause. */
function mockCounts(adultCount: number, totalActiveCount: number) {
  memberCountMock.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
    Promise.resolve(where.memberType === "ADULT" ? adultCount : totalActiveCount),
  );
}

function buildTxTransaction() {
  return (fn: (tx: unknown) => unknown) =>
    fn({
      member: { count: memberCountMock, update: memberUpdateMock },
      assignment: { update: assignmentUpdateMock, updateMany: assignmentUpdateManyMock },
      taskTransfer: { updateMany: taskTransferUpdateManyMock },
    });
}

describe("POST /api/members/me/leave", () => {
  beforeEach(() => {
    assignmentFindManyMock.mockResolvedValue([]);
    memberFindManyMock.mockResolvedValue([]);
    memberFindFirstMock.mockResolvedValue(null);
    transactionMock.mockImplementation(buildTxTransaction());
    loadTaskPlannerSnapshotMock.mockResolvedValue({ tasks: [], members: [], preferences: [], recentAssignments: [] });
    scoreCandidatesMock.mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 409 LAST_ADULT when the leaver is the last active ADULT and a non-adult member would remain", async () => {
    requireMemberMock.mockResolvedValue(baseMember());
    mockCounts(1, 2); // one active ADULT (the leaver) + one active CHILD

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.code).toBe("LAST_ADULT");
    expect(memberUpdateMock).not.toHaveBeenCalled();
    expect(taskTransferUpdateManyMock).not.toHaveBeenCalled();
    expect(deliverNotificationToMembersMock).not.toHaveBeenCalled();
  });

  it("allows a lone active member (ADULT) to leave, emptying the household with no notification", async () => {
    requireMemberMock.mockResolvedValue(baseMember());
    mockCounts(1, 1); // the leaver is the only active member in the household
    memberFindManyMock.mockResolvedValue([]); // no remaining active members

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.nextHouseholdId).toBeNull();
    expect(memberUpdateMock).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { isActive: false },
    });
    expect(deliverNotificationToMembersMock).not.toHaveBeenCalled();
  });

  it("does not check adult count for a non-ADULT member", async () => {
    requireMemberMock.mockResolvedValue(baseMember({ memberType: "TEEN" }));

    const response = await POST();

    expect(response.status).toBe(200);
    expect(memberCountMock).not.toHaveBeenCalled();
  });

  it("reassigns pending assignments, cancels pending transfers, deactivates the member, and notifies remaining members", async () => {
    requireMemberMock.mockResolvedValue(baseMember());
    mockCounts(2, 2);
    assignmentFindManyMock.mockResolvedValue([
      { id: "a1", taskId: "t1", dueDate: new Date("2026-01-05") },
    ]);
    loadTaskPlannerSnapshotMock.mockResolvedValue({
      tasks: [{ id: "t1", name: "Lavar platos", frequency: "WEEKLY", weight: 2, minAge: null, estimatedMinutes: null }],
      members: [
        { id: "member-1", name: "Sofi", memberType: "ADULT", absences: [] },
        { id: "member-2", name: "Tomi", memberType: "ADULT", absences: [] },
      ],
      preferences: [],
      recentAssignments: [],
    });
    scoreCandidatesMock.mockReturnValue([{ memberId: "member-2", memberName: "Tomi", score: 100, reasons: [] }]);
    memberFindManyMock.mockResolvedValue([{ id: "member-2" }]);
    memberUpdateMock.mockResolvedValue({ id: "member-1", isActive: false });

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(assignmentUpdateMock).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { memberId: "member-2" },
    });
    expect(taskTransferUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PENDING",
          OR: [{ fromMemberId: "member-1" }, { toMemberId: "member-1" }],
        }),
        data: expect.objectContaining({ status: "REJECTED" }),
      }),
    );
    expect(memberUpdateMock).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { isActive: false },
    });
    expect(deliverNotificationToMembersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        memberIds: ["member-2"],
        type: "MEMBER_LEFT",
        message: 'Sofi salió de "Casa Sofi"',
      }),
    );
    expect(json.nextHouseholdId).toBeNull();
  });

  it("cancels an assignment instead of reassigning when no eligible member is found", async () => {
    requireMemberMock.mockResolvedValue(baseMember());
    mockCounts(2, 2);
    assignmentFindManyMock.mockResolvedValue([
      { id: "a1", taskId: "t1", dueDate: new Date("2026-01-05") },
    ]);
    loadTaskPlannerSnapshotMock.mockResolvedValue({
      tasks: [{ id: "t1", name: "Lavar platos", frequency: "WEEKLY", weight: 2, minAge: null, estimatedMinutes: null }],
      members: [],
      preferences: [],
      recentAssignments: [],
    });
    scoreCandidatesMock.mockReturnValue([]);

    await POST();

    expect(assignmentUpdateManyMock).toHaveBeenCalledWith({
      where: { id: { in: ["a1"] } },
      data: { status: "CANCELLED" },
    });
    expect(assignmentUpdateMock).not.toHaveBeenCalled();
  });

  it("returns the other household's id when the user has another active membership", async () => {
    requireMemberMock.mockResolvedValue(baseMember());
    mockCounts(2, 2);
    memberFindFirstMock.mockResolvedValue({ householdId: "household-2" });

    const response = await POST();
    const json = await response.json();

    expect(json.nextHouseholdId).toBe("household-2");
  });

  it("returns 409 LEAVE_CONFLICT when the transaction hits a serialization failure (P2034)", async () => {
    requireMemberMock.mockResolvedValue(baseMember());
    transactionMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Transaction failed due to a write conflict", {
        code: "P2034",
        clientVersion: "6.19.2",
      }),
    );

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.code).toBe("LEAVE_CONFLICT");
  });
});
