import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  assignmentFindFirstMock,
  assignmentUpdateManyMock,
  assignmentFindUniqueOrThrowMock,
  assignmentCreateMock,
  assignmentCountMock,
  weeklyPlanFindFirstMock,
  weeklyPlanUpdateMock,
  memberFindManyMock,
  transactionMock,
  createNotificationForMembersMock,
  loadTaskPlannerSnapshotMock,
  pickNextAssigneeMock,
  pickNextRotationAssigneeMock,
} = vi.hoisted(() => ({
  assignmentFindFirstMock: vi.fn(),
  assignmentUpdateManyMock: vi.fn(),
  assignmentFindUniqueOrThrowMock: vi.fn(),
  assignmentCreateMock: vi.fn(),
  assignmentCountMock: vi.fn(),
  weeklyPlanFindFirstMock: vi.fn(),
  weeklyPlanUpdateMock: vi.fn(),
  memberFindManyMock: vi.fn(),
  transactionMock: vi.fn(),
  createNotificationForMembersMock: vi.fn(),
  loadTaskPlannerSnapshotMock: vi.fn(),
  pickNextAssigneeMock: vi.fn(),
  pickNextRotationAssigneeMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assignment: {
      findFirst: assignmentFindFirstMock,
      updateMany: assignmentUpdateManyMock,
      findUniqueOrThrow: assignmentFindUniqueOrThrowMock,
      create: assignmentCreateMock,
      count: assignmentCountMock,
    },
    weeklyPlan: { findFirst: weeklyPlanFindFirstMock, update: weeklyPlanUpdateMock },
    member: { findMany: memberFindManyMock },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/task-planner-context", () => ({
  loadTaskPlannerSnapshot: loadTaskPlannerSnapshotMock,
}));

vi.mock("@habita/domain", () => ({
  pickNextAssignee: pickNextAssigneeMock,
  pickNextRotationAssignee: pickNextRotationAssigneeMock,
}));

vi.mock("@/lib/notification-service", () => ({
  createNotificationForMembers: createNotificationForMembersMock,
}));

import { completeAssignment } from "@/lib/assignment-complete";

function baseAssignment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "a1",
    taskId: "t1",
    memberId: "assignee-1",
    householdId: "household-1",
    status: "PENDING",
    notes: null,
    task: { id: "t1", name: "Lavar platos", weight: 2, frequency: "WEEKLY" },
    member: { id: "assignee-1", name: "Assignee" },
    ...overrides,
  };
}

describe("completeAssignment", () => {
  beforeEach(() => {
    assignmentUpdateManyMock.mockResolvedValue({ count: 1 });
    weeklyPlanFindFirstMock.mockResolvedValue(null);
    memberFindManyMock.mockResolvedValue([]);
    transactionMock.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn({
        assignment: { updateMany: assignmentUpdateManyMock, findUniqueOrThrow: assignmentFindUniqueOrThrowMock },
      }),
    );
    loadTaskPlannerSnapshotMock.mockResolvedValue({ tasks: [], members: [], preferences: [], recentAssignments: [] });
    pickNextAssigneeMock.mockReturnValue(null);
    pickNextRotationAssigneeMock.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns not_found when the assignment doesn't exist in the household", async () => {
    assignmentFindFirstMock.mockResolvedValue(null);

    const result = await completeAssignment({
      householdId: "household-1",
      assignmentId: "a1",
      member: { id: "assignee-1", name: "Assignee" },
    });

    expect(result).toEqual({ kind: "not_found" });
  });

  it("returns already_completed when the assignment is already COMPLETED", async () => {
    assignmentFindFirstMock.mockResolvedValue(baseAssignment({ status: "COMPLETED" }));

    const result = await completeAssignment({
      householdId: "household-1",
      assignmentId: "a1",
      member: { id: "assignee-1", name: "Assignee" },
    });

    expect(result).toEqual({ kind: "already_completed" });
  });

  it("returns already_completed when the assignment is already VERIFIED", async () => {
    assignmentFindFirstMock.mockResolvedValue(baseAssignment({ status: "VERIFIED" }));

    const result = await completeAssignment({
      householdId: "household-1",
      assignmentId: "a1",
      member: { id: "assignee-1", name: "Assignee" },
    });

    expect(result).toEqual({ kind: "already_completed" });
  });

  it("returns cancelled when the assignment was cancelled", async () => {
    assignmentFindFirstMock.mockResolvedValue(baseAssignment({ status: "CANCELLED" }));

    const result = await completeAssignment({
      householdId: "household-1",
      assignmentId: "a1",
      member: { id: "assignee-1", name: "Assignee" },
    });

    expect(result).toEqual({ kind: "cancelled" });
  });

  it("returns already_completed when the atomic updateMany loses the race (count 0)", async () => {
    assignmentFindFirstMock.mockResolvedValue(baseAssignment());
    assignmentUpdateManyMock.mockResolvedValue({ count: 0 });

    const result = await completeAssignment({
      householdId: "household-1",
      assignmentId: "a1",
      member: { id: "assignee-1", name: "Assignee" },
    });

    expect(result).toEqual({ kind: "already_completed" });
    expect(assignmentFindUniqueOrThrowMock).not.toHaveBeenCalled();
  });

  it("completes the assignment, credits the completer, and does not notify when self-completed", async () => {
    assignmentFindFirstMock.mockResolvedValue(baseAssignment());
    assignmentFindUniqueOrThrowMock.mockResolvedValue(
      baseAssignment({
        status: "COMPLETED",
        completedByMember: { id: "assignee-1", name: "Assignee" },
      }),
    );

    const result = await completeAssignment({
      householdId: "household-1",
      assignmentId: "a1",
      member: { id: "assignee-1", name: "Assignee" },
    });

    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") throw new Error("expected completed");
    expect(result.completedBy).toEqual({ id: "assignee-1", name: "Assignee" });
    expect(createNotificationForMembersMock).not.toHaveBeenCalled();
    expect(assignmentUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ completedByMemberId: "assignee-1" }) }),
    );
  });

  it("notifies the assignee when a different member completes the task", async () => {
    assignmentFindFirstMock.mockResolvedValue(baseAssignment());
    assignmentFindUniqueOrThrowMock.mockResolvedValue(
      baseAssignment({
        status: "COMPLETED",
        completedByMember: { id: "helper-1", name: "Helper" },
      }),
    );

    await completeAssignment({
      householdId: "household-1",
      assignmentId: "a1",
      member: { id: "helper-1", name: "Helper" },
    });

    expect(createNotificationForMembersMock).toHaveBeenCalledWith(
      ["assignee-1"],
      expect.objectContaining({
        type: "TASK_COMPLETED_BY_OTHER",
        message: "Helper hizo Lavar platos por vos",
      }),
    );
  });

  it("uses pickNextRotationAssignee for the next occurrence of a rotating task", async () => {
    assignmentFindFirstMock.mockResolvedValue(baseAssignment());
    assignmentFindUniqueOrThrowMock.mockResolvedValue(
      baseAssignment({ status: "COMPLETED", completedByMember: { id: "assignee-1", name: "Assignee" } }),
    );
    loadTaskPlannerSnapshotMock.mockResolvedValue({
      tasks: [{ id: "t1", name: "Lavar platos", frequency: "WEEKLY", weight: 2, minAge: null, estimatedMinutes: null, isRotating: true }],
      members: [],
      preferences: [],
      recentAssignments: [],
    });
    pickNextRotationAssigneeMock.mockReturnValue({ memberId: "next-1", memberName: "Next", score: 0, reasons: [] });
    assignmentCreateMock.mockResolvedValue({ id: "a2", memberId: "next-1", dueDate: new Date() });

    const result = await completeAssignment({
      householdId: "household-1",
      assignmentId: "a1",
      member: { id: "assignee-1", name: "Assignee" },
    });

    expect(pickNextRotationAssigneeMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t1", isRotating: true }),
      "assignee-1",
      expect.any(Date),
      expect.anything(),
    );
    expect(pickNextAssigneeMock).not.toHaveBeenCalled();
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") throw new Error("expected completed");
    expect(result.nextAssignment).toEqual({ id: "a2", memberId: "next-1", dueDate: expect.any(Date) });
  });

  it("reports planFinalized when the active plan has no remaining assignments", async () => {
    assignmentFindFirstMock.mockResolvedValue(baseAssignment());
    assignmentFindUniqueOrThrowMock.mockResolvedValue(
      baseAssignment({ status: "COMPLETED", completedByMember: { id: "assignee-1", name: "Assignee" } }),
    );
    weeklyPlanFindFirstMock.mockResolvedValue({ id: "plan-1", createdAt: new Date(), expiresAt: new Date(), appliedAt: new Date() });
    assignmentCountMock.mockResolvedValue(0);
    memberFindManyMock.mockResolvedValue([{ id: "assignee-1" }, { id: "helper-1" }]);

    const result = await completeAssignment({
      householdId: "household-1",
      assignmentId: "a1",
      member: { id: "assignee-1", name: "Assignee" },
    });

    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") throw new Error("expected completed");
    expect(result.planFinalized).toBe(true);
    expect(result.finalizedPlanId).toBe("plan-1");
    expect(createNotificationForMembersMock).toHaveBeenCalledWith(
      ["assignee-1", "helper-1"],
      expect.objectContaining({ type: "PLAN_APPLIED" }),
    );
  });
});
