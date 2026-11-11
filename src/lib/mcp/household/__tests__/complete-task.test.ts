import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { completeAssignmentMock, resolveMcpMemberMock } = vi.hoisted(() => ({
  completeAssignmentMock: vi.fn(),
  resolveMcpMemberMock: vi.fn(),
}));

vi.mock("@/lib/assignment-complete", () => ({ completeAssignment: completeAssignmentMock }));
vi.mock("../resolve-member", () => ({
  resolveMcpMember: resolveMcpMemberMock,
  mcpMemberErrorToToolResult: (result: { kind: string }) => ({ isError: true, content: [{ type: "text", text: result.kind }] }),
}));

import { handleCompleteTask, completeTaskInputSchema } from "../tools/complete-task";

const identity = { userId: "user-1", scopes: new Set(["habita"]) };
const member = { id: "member-1", name: "Franco", householdId: "house-a" };

function parseOutput(result: Awaited<ReturnType<typeof handleCompleteTask>>) {
  if (result.content[0]?.type !== "text") throw new Error("Expected text content");
  return JSON.parse(result.content[0].text) as Record<string, unknown>;
}

describe("handleCompleteTask", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("resolves the member and completes the assignment", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member });
    completeAssignmentMock.mockResolvedValue({
      kind: "completed",
      assignment: { id: "a1", status: "COMPLETED", task: { name: "Lavar platos" } },
      completedBy: { id: "member-1", name: "Franco" },
      planFinalized: false,
      finalizedPlanId: undefined,
      nextAssignment: { id: "a2", memberId: "member-2", dueDate: new Date("2026-11-20") },
      warnings: { nextAssignmentCreated: true },
    });

    const result = await handleCompleteTask(identity, { householdId: "house-a", assignmentId: "a1" });

    expect(result.isError).toBeFalsy();
    expect(resolveMcpMemberMock).toHaveBeenCalledWith("user-1", "house-a");
    expect(completeAssignmentMock).toHaveBeenCalledWith({
      householdId: "house-a",
      assignmentId: "a1",
      member: { id: "member-1", name: "Franco" },
      notes: undefined,
    });
    const output = parseOutput(result);
    expect(output.assignment).toEqual({ id: "a1", status: "COMPLETED" });
    expect(output.task).toEqual({ name: "Lavar platos" });
    expect(output.nextAssignment).toEqual({ id: "a2", memberId: "member-2", dueDate: "2026-11-20T00:00:00.000Z" });
  });

  it("returns a success no-op when the assignment was already completed", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member });
    completeAssignmentMock.mockResolvedValue({ kind: "already_completed" });

    const result = await handleCompleteTask(identity, { assignmentId: "a1" });

    expect(result.isError).toBeFalsy();
    const output = parseOutput(result);
    expect(output).toEqual({ assignment: { id: "a1", status: "COMPLETED" }, alreadyCompleted: true });
  });

  it("returns isError when the assignment is not found in the household", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member });
    completeAssignmentMock.mockResolvedValue({ kind: "not_found" });

    const result = await handleCompleteTask(identity, { assignmentId: "missing" });

    expect(result.isError).toBe(true);
    if (result.content[0]?.type !== "text") throw new Error("Expected text content");
    expect(result.content[0].text).toBe("Assignment not found in this household.");
  });

  it("returns isError when the assignment was cancelled", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member });
    completeAssignmentMock.mockResolvedValue({ kind: "cancelled" });

    const result = await handleCompleteTask(identity, { assignmentId: "a1" });

    expect(result.isError).toBe(true);
  });

  it("returns an error result without completing when resolution fails (foreign household)", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "not_a_member" });

    const result = await handleCompleteTask(identity, { householdId: "other-house", assignmentId: "a1" });

    expect(result.isError).toBe(true);
    expect(completeAssignmentMock).not.toHaveBeenCalled();
  });

  it("returns the ambiguous household result when resolution is ambiguous", async () => {
    resolveMcpMemberMock.mockResolvedValue({
      kind: "ambiguous",
      households: [{ id: "house-a", name: "Casa A" }, { id: "house-b", name: "Casa B" }],
    });

    const result = await handleCompleteTask(identity, { assignmentId: "a1" });

    expect(result.isError).toBe(true);
    expect(completeAssignmentMock).not.toHaveBeenCalled();
  });
});

describe("completeTaskInputSchema", () => {
  it("rejects a missing assignmentId", () => {
    const result = z.object(completeTaskInputSchema).safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects notes longer than 500 chars", () => {
    const result = z.object(completeTaskInputSchema).safeParse({ assignmentId: "a1", notes: "x".repeat(501) });

    expect(result.success).toBe(false);
  });
});
