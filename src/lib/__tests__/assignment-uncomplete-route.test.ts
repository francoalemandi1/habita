import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/assignments/[assignmentId]/uncomplete/route";

const { requireMemberMock, assignmentFindFirstMock, txUpdateMock, txDeleteManyMock } = vi.hoisted(() => ({
  requireMemberMock: vi.fn(),
  assignmentFindFirstMock: vi.fn(),
  txUpdateMock: vi.fn(),
  txDeleteManyMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireMember: requireMemberMock }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assignment: { findFirst: assignmentFindFirstMock },
    $transaction: (run: (tx: unknown) => Promise<unknown>) =>
      run({ assignment: { update: txUpdateMock, deleteMany: txDeleteManyMock } }),
  },
}));

const routeParams = { params: Promise.resolve({ assignmentId: "a1" }) };
const completedAt = new Date("2026-11-06T10:00:00.000Z");
const dueDate = new Date("2026-11-06T23:59:59.999Z");

function uncompleteRequest(): NextRequest {
  return new NextRequest("http://localhost/api/assignments/a1/uncomplete", { method: "POST" });
}

describe("POST /api/assignments/[assignmentId]/uncomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireMemberMock.mockResolvedValue({ id: "m1", householdId: "h1" });
  });

  it("reverts the assignment and removes the next occurrence its completion created", async () => {
    assignmentFindFirstMock.mockResolvedValue({
      id: "a1",
      taskId: "t1",
      memberId: "m1",
      status: "COMPLETED",
      dueDate,
      completedAt,
    });

    const response = await POST(uncompleteRequest(), routeParams);

    expect(response.status).toBe(200);
    expect(txUpdateMock).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { status: "PENDING", completedAt: null, completedByMemberId: null },
    });
    expect(txDeleteManyMock).toHaveBeenCalledWith({
      where: {
        householdId: "h1",
        taskId: "t1",
        status: "PENDING",
        createdAt: { gte: completedAt },
        dueDate: { gt: dueDate },
      },
    });
  });

  it("rejects assignments that are not completed", async () => {
    assignmentFindFirstMock.mockResolvedValue({
      id: "a1",
      taskId: "t1",
      memberId: "m1",
      status: "PENDING",
      dueDate,
      completedAt: null,
    });

    const response = await POST(uncompleteRequest(), routeParams);

    expect(response.status).toBe(400);
    expect(txUpdateMock).not.toHaveBeenCalled();
  });
});
