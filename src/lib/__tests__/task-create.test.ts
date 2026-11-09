import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  taskFindFirstMock,
  taskCreateMock,
  memberFindFirstMock,
  transactionMock,
  queryRawMock,
  assignmentFindFirstMock,
  assignmentCreateMock,
  getBestAssigneeMock,
} = vi.hoisted(() => ({
  taskFindFirstMock: vi.fn(),
  taskCreateMock: vi.fn(),
  memberFindFirstMock: vi.fn(),
  transactionMock: vi.fn(),
  queryRawMock: vi.fn(),
  assignmentFindFirstMock: vi.fn(),
  assignmentCreateMock: vi.fn(),
  getBestAssigneeMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findFirst: taskFindFirstMock, create: taskCreateMock },
    member: { findFirst: memberFindFirstMock },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/assignment-algorithm", () => ({ getBestAssignee: getBestAssigneeMock }));

import { Prisma } from "@prisma/client";
import { createTaskIdempotent } from "@/lib/task-create";

import type { CreateTaskInput } from "@/lib/validations/task";

function buildInput(overrides: Partial<CreateTaskInput> = {}): CreateTaskInput {
  return {
    name: "Lavar los platos",
    frequency: "WEEKLY",
    weight: 2,
    isRouletteEligible: false,
    ...overrides,
  };
}

const DUE_DATE = new Date("2026-11-15T12:00:00.000Z");
const DIRECT_ASSIGNMENT = { memberId: "member-2", dueDate: DUE_DATE };

describe("createTaskIdempotent", () => {
  beforeEach(() => {
    transactionMock.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn({
        $queryRaw: queryRawMock,
        assignment: { findFirst: assignmentFindFirstMock, create: assignmentCreateMock },
      }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new task and its first assignment when given a fresh idempotencyKey", async () => {
    taskFindFirstMock.mockResolvedValue(null);
    taskCreateMock.mockResolvedValue({ id: "task-1" });
    memberFindFirstMock.mockResolvedValue({ id: "member-2" });
    assignmentFindFirstMock.mockResolvedValue(null);
    assignmentCreateMock.mockResolvedValue({ id: "assignment-1", taskId: "task-1", memberId: "member-2" });

    const result = await createTaskIdempotent({
      householdId: "household-1",
      input: buildInput({ idempotencyKey: "fresh-key-1", initialAssignment: DIRECT_ASSIGNMENT }),
      requestingMemberType: "ADULT",
    });

    expect(result.isNew).toBe(true);
    expect(result.task).toEqual({ id: "task-1" });
    expect(result.assignment).toEqual({ id: "assignment-1", taskId: "task-1", memberId: "member-2" });
    expect(taskCreateMock).toHaveBeenCalledTimes(1);
    expect(assignmentCreateMock).toHaveBeenCalledTimes(1);
  });

  it("replays an existing idempotencyKey without creating a new task or assignment", async () => {
    const existingTask = { id: "task-1" };
    const existingAssignment = { id: "assignment-1", taskId: "task-1", memberId: "member-2" };
    taskFindFirstMock.mockResolvedValue(existingTask);
    memberFindFirstMock.mockResolvedValue({ id: "member-2" });
    assignmentFindFirstMock.mockResolvedValue(existingAssignment);

    const result = await createTaskIdempotent({
      householdId: "household-1",
      input: buildInput({ idempotencyKey: "repeat-key", initialAssignment: DIRECT_ASSIGNMENT }),
      requestingMemberType: "ADULT",
    });

    expect(result.isNew).toBe(false);
    expect(result.task).toEqual(existingTask);
    expect(result.assignment).toEqual(existingAssignment);
    expect(taskCreateMock).not.toHaveBeenCalled();
    expect(assignmentCreateMock).not.toHaveBeenCalled();
  });

  it("does not hand out a second assignment when a late replay finds the first one already completed", async () => {
    const completedAssignment = { id: "assignment-1", taskId: "task-1", memberId: "member-2", status: "COMPLETED" };
    taskFindFirstMock.mockResolvedValue({ id: "task-1" });
    memberFindFirstMock.mockResolvedValue({ id: "member-2" });
    assignmentFindFirstMock.mockResolvedValue(completedAssignment);

    const result = await createTaskIdempotent({
      householdId: "household-1",
      input: buildInput({ idempotencyKey: "late-replay-key", initialAssignment: DIRECT_ASSIGNMENT }),
      requestingMemberType: "ADULT",
    });

    expect(result.assignment).toEqual(completedAssignment);
    expect(assignmentFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { taskId: "task-1", householdId: "household-1" } }),
    );
    expect(assignmentCreateMock).not.toHaveBeenCalled();
  });

  it("creates only the assignment when the task already exists but has no assignment yet", async () => {
    const existingTask = { id: "task-1" };
    taskFindFirstMock.mockResolvedValue(existingTask);
    memberFindFirstMock.mockResolvedValue({ id: "member-2" });
    assignmentFindFirstMock.mockResolvedValue(null);
    assignmentCreateMock.mockResolvedValue({ id: "assignment-1", taskId: "task-1", memberId: "member-2" });

    const result = await createTaskIdempotent({
      householdId: "household-1",
      input: buildInput({ idempotencyKey: "half-done-key", initialAssignment: DIRECT_ASSIGNMENT }),
      requestingMemberType: "ADULT",
    });

    expect(result.isNew).toBe(false);
    expect(taskCreateMock).not.toHaveBeenCalled();
    expect(assignmentCreateMock).toHaveBeenCalledTimes(1);
    expect(result.assignment).toEqual({ id: "assignment-1", taskId: "task-1", memberId: "member-2" });
  });

  it("refetches the winning task on a P2002 unique-constraint race", async () => {
    const winner = { id: "task-winner" };
    taskFindFirstMock.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
    taskCreateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }),
    );

    const result = await createTaskIdempotent({
      householdId: "household-1",
      input: buildInput({ idempotencyKey: "race-key" }),
      requestingMemberType: "ADULT",
    });

    expect(result.isNew).toBe(false);
    expect(result.task).toEqual(winner);
    expect(taskFindFirstMock).toHaveBeenCalledTimes(2);
  });

  it("creates a plain task without an idempotencyKey lookup when none is given (legacy behavior)", async () => {
    taskCreateMock.mockResolvedValue({ id: "task-legacy" });

    const result = await createTaskIdempotent({
      householdId: "household-1",
      input: buildInput(),
      requestingMemberType: "ADULT",
    });

    expect(result.isNew).toBe(true);
    expect(result.assignment).toBeNull();
    expect(taskFindFirstMock).not.toHaveBeenCalled();
    expect(taskCreateMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a direct assignment to a member from another household before creating anything", async () => {
    memberFindFirstMock.mockResolvedValue(null);

    await expect(
      createTaskIdempotent({
        householdId: "household-1",
        input: buildInput({ idempotencyKey: "cross-household-key", initialAssignment: DIRECT_ASSIGNMENT }),
        requestingMemberType: "ADULT",
      }),
    ).rejects.toThrow();

    expect(taskCreateMock).not.toHaveBeenCalled();
    expect(taskFindFirstMock).not.toHaveBeenCalled();
    expect(assignmentCreateMock).not.toHaveBeenCalled();
  });

  it("auto-assigns to the best available member when initialAssignment.memberId is null", async () => {
    taskCreateMock.mockResolvedValue({ id: "task-auto" });
    getBestAssigneeMock.mockResolvedValue({ best: { memberId: "member-3" }, scores: [] });
    assignmentFindFirstMock.mockResolvedValue(null);
    assignmentCreateMock.mockResolvedValue({ id: "assignment-auto", taskId: "task-auto", memberId: "member-3" });

    const result = await createTaskIdempotent({
      householdId: "household-1",
      input: buildInput({ initialAssignment: { memberId: null, dueDate: DUE_DATE } }),
      requestingMemberType: "ADULT",
    });

    expect(getBestAssigneeMock).toHaveBeenCalledWith("household-1", "task-auto", DUE_DATE);
    expect(result.assignment).toEqual({ id: "assignment-auto", taskId: "task-auto", memberId: "member-3" });
    expect(memberFindFirstMock).not.toHaveBeenCalled();
  });
});
