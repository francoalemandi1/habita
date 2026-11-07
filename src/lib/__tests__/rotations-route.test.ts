import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireMemberMock, requirePermissionMock, taskFindFirstMock, taskFindManyMock, taskUpdateMock } = vi.hoisted(
  () => ({
    requireMemberMock: vi.fn(),
    requirePermissionMock: vi.fn(),
    taskFindFirstMock: vi.fn(),
    taskFindManyMock: vi.fn(),
    taskUpdateMock: vi.fn(),
  }),
);

vi.mock("@/lib/session", () => ({
  requireMember: requireMemberMock,
  requirePermission: requirePermissionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findFirst: taskFindFirstMock, findMany: taskFindManyMock, update: taskUpdateMock },
  },
}));

import { GET, POST } from "@/app/api/rotations/route";
import { PATCH, DELETE } from "@/app/api/rotations/[rotationId]/route";

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/rotations", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("rotations API (flag-backed)", () => {
  beforeEach(() => {
    requireMemberMock.mockResolvedValue({ householdId: "household-1" });
    requirePermissionMock.mockResolvedValue({ householdId: "household-1" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("GET lists rotating tasks shaped as the legacy rotation JSON", async () => {
    taskFindManyMock.mockResolvedValue([
      { id: "t1", name: "Lavar platos", frequency: "WEEKLY", weight: 2, createdAt: new Date(), updatedAt: new Date() },
    ]);

    const response = await GET();
    const json = await response.json();

    expect(taskFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { householdId: "household-1", isRotating: true } }),
    );
    expect(json.rotations[0]).toMatchObject({
      id: "t1",
      taskId: "t1",
      frequency: "WEEKLY",
      isActive: true,
      lastGenerated: null,
      nextDueDate: null,
    });
  });

  it("POST returns 409 when the task is already rotating", async () => {
    taskFindFirstMock.mockResolvedValue({ id: "t1", name: "x", frequency: "WEEKLY", weight: 1, isRotating: true });

    const response = await POST(buildRequest({ taskId: "t1", frequency: "WEEKLY" }));

    expect(response.status).toBe(409);
    expect(taskUpdateMock).not.toHaveBeenCalled();
  });

  it("POST flags the task as rotating when it is not already", async () => {
    taskFindFirstMock.mockResolvedValue({ id: "t1", name: "x", frequency: "WEEKLY", weight: 1, isRotating: false });
    taskUpdateMock.mockResolvedValue({
      id: "t1",
      name: "x",
      frequency: "WEEKLY",
      weight: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await POST(buildRequest({ taskId: "t1", frequency: "WEEKLY" }));
    const json = await response.json();

    expect(taskUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "t1" }, data: { isRotating: true } }),
    );
    expect(response.status).toBe(201);
    expect(json.rotation.isActive).toBe(true);
  });

  it("PATCH {isActive:false} clears the task's isRotating flag", async () => {
    taskFindFirstMock.mockResolvedValue({ id: "t1" });
    taskUpdateMock.mockResolvedValue({
      id: "t1",
      name: "x",
      frequency: "WEEKLY",
      weight: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await PATCH(
      new NextRequest("http://localhost:3000/api/rotations/t1", {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ rotationId: "t1" }) },
    );
    const json = await response.json();

    expect(taskUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "t1" }, data: { isRotating: false } }),
    );
    expect(json.rotation.isActive).toBe(false);
  });

  it("DELETE flags the task as not rotating", async () => {
    taskFindFirstMock.mockResolvedValue({ id: "t1" });
    taskUpdateMock.mockResolvedValue({ id: "t1" });

    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/rotations/t1", { method: "DELETE" }),
      { params: Promise.resolve({ rotationId: "t1" }) },
    );

    expect(response.status).toBe(200);
    expect(taskUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "t1" }, data: { isRotating: false } }),
    );
  });
});
