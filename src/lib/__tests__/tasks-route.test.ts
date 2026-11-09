import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requirePermissionMock, createTaskIdempotentMock } = vi.hoisted(() => ({
  requirePermissionMock: vi.fn(),
  createTaskIdempotentMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  requireMember: vi.fn(),
  requirePermission: requirePermissionMock,
}));

vi.mock("@/lib/task-create", () => ({ createTaskIdempotent: createTaskIdempotentMock }));

import { POST } from "@/app/api/tasks/route";

function buildMember(overrides: Partial<{ id: string; householdId: string; memberType: string }> = {}) {
  return { id: "member-1", householdId: "household-1", memberType: "ADULT", ...overrides };
}

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/tasks", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/tasks", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 201 for a legacy body with no idempotencyKey or initialAssignment", async () => {
    requirePermissionMock.mockResolvedValue(buildMember());
    createTaskIdempotentMock.mockResolvedValue({ task: { id: "task-1" }, assignment: null, isNew: true });

    const response = await POST(buildRequest({ name: "Lavar los platos", frequency: "WEEKLY", weight: 2 }));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json).toEqual({ task: { id: "task-1" } });
  });

  it("returns 200 when the save replays an existing idempotencyKey", async () => {
    requirePermissionMock.mockResolvedValue(buildMember());
    createTaskIdempotentMock.mockResolvedValue({ task: { id: "task-1" }, assignment: null, isNew: false });

    const response = await POST(
      buildRequest({ name: "Lavar los platos", frequency: "WEEKLY", weight: 2, idempotencyKey: "repeat-key-1" }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ task: { id: "task-1" } });
  });

  it("includes the assignment in the response when one was ensured", async () => {
    requirePermissionMock.mockResolvedValue(buildMember());
    createTaskIdempotentMock.mockResolvedValue({
      task: { id: "task-1" },
      assignment: { id: "assignment-1" },
      isNew: true,
    });

    const response = await POST(
      buildRequest({
        name: "Lavar los platos",
        frequency: "WEEKLY",
        weight: 2,
        initialAssignment: { memberId: "member-2", dueDate: "2026-11-15T12:00:00.000Z" },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json).toEqual({ task: { id: "task-1" }, assignment: { id: "assignment-1" } });
  });

  it("rejects an invalid body with 400 before calling createTaskIdempotent", async () => {
    requirePermissionMock.mockResolvedValue(buildMember());

    const response = await POST(buildRequest({ name: "a" }));

    expect(response.status).toBe(400);
    expect(createTaskIdempotentMock).not.toHaveBeenCalled();
  });
});
