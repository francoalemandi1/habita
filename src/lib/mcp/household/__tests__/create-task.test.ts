import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { BadRequestError, ForbiddenError } from "@/lib/errors";

const { createTaskIdempotentMock, resolveMcpMemberMock } = vi.hoisted(() => ({
  createTaskIdempotentMock: vi.fn(),
  resolveMcpMemberMock: vi.fn(),
}));

vi.mock("@/lib/task-create", () => ({ createTaskIdempotent: createTaskIdempotentMock }));
vi.mock("../resolve-member", () => ({
  resolveMcpMember: resolveMcpMemberMock,
  mcpMemberErrorToToolResult: (result: { kind: string }) => ({ isError: true, content: [{ type: "text", text: result.kind }] }),
}));

import { handleCreateTask, createTaskInputSchema } from "../tools/create-task";

const adultMember = { id: "member-1", name: "Franco", householdId: "house-a", memberType: "ADULT" };
const childMember = { id: "member-2", name: "Kid", householdId: "house-a", memberType: "CHILD" };
const identity = { userId: "user-1", scopes: new Set(["habita"]) };

function parseOutput(result: Awaited<ReturnType<typeof handleCreateTask>>) {
  if (result.content[0]?.type !== "text") throw new Error("Expected text content");
  return JSON.parse(result.content[0].text) as Record<string, unknown>;
}

describe("handleCreateTask", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new task and auto-assigns it when no assignee is given", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member: adultMember });
    createTaskIdempotentMock.mockResolvedValue({
      task: { id: "task-1", name: "Lavar platos", frequency: "WEEKLY", weight: 2 },
      assignment: { id: "a1", memberId: "member-3", member: { id: "member-3", name: "Best" }, dueDate: new Date("2026-11-20") },
      isNew: true,
    });

    const result = await handleCreateTask(identity, {
      name: "Lavar platos",
      idempotencyKey: "fresh-key-1",
    });

    expect(result.isError).toBeFalsy();
    expect(resolveMcpMemberMock).toHaveBeenCalledWith("user-1", undefined);
    expect(createTaskIdempotentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: "house-a",
        requestingMemberType: "ADULT",
        input: expect.objectContaining({
          name: "Lavar platos",
          idempotencyKey: "fresh-key-1",
          initialAssignment: expect.objectContaining({ memberId: null }),
        }),
      }),
    );
    const output = parseOutput(result);
    expect(output.created).toBe(true);
    expect(output.assignment).toEqual({
      id: "a1",
      memberId: "member-3",
      memberName: "Best",
      dueDate: "2026-11-20T00:00:00.000Z",
    });
  });

  it("assigns directly to assignToMemberId when given", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member: adultMember });
    createTaskIdempotentMock.mockResolvedValue({
      task: { id: "task-1", name: "Lavar platos", frequency: "WEEKLY", weight: 2 },
      assignment: { id: "a1", memberId: "member-2", member: { id: "member-2", name: "Kid" }, dueDate: new Date("2026-11-20") },
      isNew: true,
    });

    await handleCreateTask(identity, { name: "Lavar platos", idempotencyKey: "fresh-key-1", assignToMemberId: "member-2" });

    expect(createTaskIdempotentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ initialAssignment: expect.objectContaining({ memberId: "member-2" }) }),
      }),
    );
  });

  it("returns created:false on a replay (isNew false)", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member: adultMember });
    createTaskIdempotentMock.mockResolvedValue({
      task: { id: "task-1", name: "Lavar platos", frequency: "WEEKLY", weight: 2 },
      assignment: null,
      isNew: false,
    });

    const result = await handleCreateTask(identity, { name: "Lavar platos", idempotencyKey: "repeat-key" });

    const output = parseOutput(result);
    expect(output.created).toBe(false);
    expect(output.assignment).toBeNull();
  });

  it("denies task creation for a member without task:create permission", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member: childMember });

    const result = await handleCreateTask(identity, { name: "Lavar platos", idempotencyKey: "fresh-key-1" });

    expect(result.isError).toBe(true);
    expect(createTaskIdempotentMock).not.toHaveBeenCalled();
  });

  it("returns isError without creating when resolution fails", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "not_a_member" });

    const result = await handleCreateTask(identity, { name: "Lavar platos", idempotencyKey: "fresh-key-1" });

    expect(result.isError).toBe(true);
    expect(createTaskIdempotentMock).not.toHaveBeenCalled();
  });

  it("surfaces a ForbiddenError from a direct assignment the caller can't make", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member: adultMember });
    createTaskIdempotentMock.mockRejectedValue(new ForbiddenError("No tenes permiso para asignar esta tarea"));

    const result = await handleCreateTask(identity, {
      name: "Lavar platos",
      idempotencyKey: "fresh-key-1",
      assignToMemberId: "member-2",
    });

    expect(result.isError).toBe(true);
    if (result.content[0]?.type !== "text") throw new Error("Expected text content");
    expect(result.content[0].text).toBe("No tenes permiso para asignar esta tarea");
  });

  it("surfaces a BadRequestError message", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member: adultMember });
    createTaskIdempotentMock.mockRejectedValue(new BadRequestError("No hay miembros elegibles para esta tarea"));

    const result = await handleCreateTask(identity, { name: "Lavar platos", idempotencyKey: "fresh-key-1" });

    expect(result.isError).toBe(true);
    if (result.content[0]?.type !== "text") throw new Error("Expected text content");
    expect(result.content[0].text).toBe("No hay miembros elegibles para esta tarea");
  });

  it("rejects an invalid idempotencyKey (too short) before calling createTaskIdempotent", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member: adultMember });

    const result = await handleCreateTask(identity, { name: "Lavar platos", idempotencyKey: "short" });

    expect(result.isError).toBe(true);
    expect(createTaskIdempotentMock).not.toHaveBeenCalled();
  });
});

describe("createTaskInputSchema", () => {
  it("rejects a missing idempotencyKey", () => {
    const result = z.object(createTaskInputSchema).safeParse({ name: "Lavar platos" });

    expect(result.success).toBe(false);
  });

  it("rejects an idempotencyKey containing a colon", () => {
    const result = z.object(createTaskInputSchema).safeParse({ name: "Lavar platos", idempotencyKey: "bad:key:1" });

    expect(result.success).toBe(false);
  });

  it("rejects a name shorter than 2 chars", () => {
    const result = z.object(createTaskInputSchema).safeParse({ name: "A", idempotencyKey: "fresh-key-1" });

    expect(result.success).toBe(false);
  });
});
