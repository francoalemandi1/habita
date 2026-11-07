import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireMemberMock,
  assignmentFindFirstMock,
  assignmentUpdateManyMock,
  assignmentFindUniqueOrThrowMock,
  assignmentCreateMock,
  weeklyPlanFindFirstMock,
  memberFindManyMock,
  transactionMock,
  createNotificationForMembersMock,
  loadTaskPlannerSnapshotMock,
  pickNextAssigneeMock,
  pickNextRotationAssigneeMock,
} = vi.hoisted(() => ({
  requireMemberMock: vi.fn(),
  assignmentFindFirstMock: vi.fn(),
  assignmentUpdateManyMock: vi.fn(),
  assignmentFindUniqueOrThrowMock: vi.fn(),
  assignmentCreateMock: vi.fn(),
  weeklyPlanFindFirstMock: vi.fn(),
  memberFindManyMock: vi.fn(),
  transactionMock: vi.fn(),
  createNotificationForMembersMock: vi.fn(),
  loadTaskPlannerSnapshotMock: vi.fn(),
  pickNextAssigneeMock: vi.fn(),
  pickNextRotationAssigneeMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireMember: requireMemberMock }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assignment: {
      findFirst: assignmentFindFirstMock,
      updateMany: assignmentUpdateManyMock,
      findUniqueOrThrow: assignmentFindUniqueOrThrowMock,
      create: assignmentCreateMock,
    },
    weeklyPlan: { findFirst: weeklyPlanFindFirstMock },
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

import { POST } from "@/app/api/assignments/[assignmentId]/complete/route";

function buildRequest(body: unknown = {}) {
  return new NextRequest("http://localhost:3000/api/assignments/a1/complete", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

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

describe("POST /api/assignments/[assignmentId]/complete", () => {
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

  it("credits the completer and does not notify when the assignee completes their own task", async () => {
    requireMemberMock.mockResolvedValue({ id: "assignee-1", name: "Assignee", householdId: "household-1" });
    assignmentFindFirstMock.mockResolvedValue(baseAssignment());
    assignmentFindUniqueOrThrowMock.mockResolvedValue(
      baseAssignment({
        status: "COMPLETED",
        completedByMember: { id: "assignee-1", name: "Assignee" },
      }),
    );

    const response = await POST(buildRequest(), { params: Promise.resolve({ assignmentId: "a1" }) });
    const json = await response.json();

    expect(assignmentUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ completedByMemberId: "assignee-1" }) }),
    );
    expect(createNotificationForMembersMock).not.toHaveBeenCalled();
    expect(json.completedBy).toEqual({ id: "assignee-1", name: "Assignee" });
  });

  it("notifies the assignee when a different member completes the task", async () => {
    requireMemberMock.mockResolvedValue({ id: "helper-1", name: "Helper", householdId: "household-1" });
    assignmentFindFirstMock.mockResolvedValue(baseAssignment());
    assignmentFindUniqueOrThrowMock.mockResolvedValue(
      baseAssignment({
        status: "COMPLETED",
        completedByMember: { id: "helper-1", name: "Helper" },
      }),
    );

    await POST(buildRequest(), { params: Promise.resolve({ assignmentId: "a1" }) });

    expect(createNotificationForMembersMock).toHaveBeenCalledWith(
      ["assignee-1"],
      expect.objectContaining({
        type: "TASK_COMPLETED_BY_OTHER",
        message: "Helper hizo Lavar platos por vos",
      }),
    );
  });

  it("uses pickNextRotationAssignee for the next occurrence of a rotating task", async () => {
    requireMemberMock.mockResolvedValue({ id: "assignee-1", name: "Assignee", householdId: "household-1" });
    const assignment = baseAssignment();
    assignmentFindFirstMock.mockResolvedValue(assignment);
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

    await POST(buildRequest(), { params: Promise.resolve({ assignmentId: "a1" }) });

    expect(pickNextRotationAssigneeMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t1", isRotating: true }),
      "assignee-1",
      expect.any(Date),
      expect.anything(),
    );
    expect(pickNextAssigneeMock).not.toHaveBeenCalled();
    expect(assignmentCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ memberId: "next-1" }) }),
    );
  });
});
