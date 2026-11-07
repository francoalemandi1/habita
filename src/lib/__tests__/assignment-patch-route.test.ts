import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { PATCH } from "@/app/api/assignments/[assignmentId]/route";

const { requireMemberMock, assignmentFindFirstMock, assignmentUpdateMock, memberFindFirstMock } = vi.hoisted(
  () => ({
    requireMemberMock: vi.fn(),
    assignmentFindFirstMock: vi.fn(),
    assignmentUpdateMock: vi.fn(),
    memberFindFirstMock: vi.fn(),
  }),
);

vi.mock("@/lib/session", () => ({ requireMember: requireMemberMock }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assignment: { findFirst: assignmentFindFirstMock, update: assignmentUpdateMock },
    member: { findFirst: memberFindFirstMock },
  },
}));

function patchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/assignments/a1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

const routeParams = { params: Promise.resolve({ assignmentId: "a1" }) };

describe("PATCH /api/assignments/[assignmentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireMemberMock.mockResolvedValue({ id: "m1", householdId: "h1" });
    assignmentUpdateMock.mockResolvedValue({ id: "a1" });
  });

  it("reschedules an open assignment", async () => {
    assignmentFindFirstMock.mockResolvedValue({ id: "a1", status: "PENDING" });

    const response = await PATCH(patchRequest({ dueDate: "2026-11-12T23:59:59.000Z" }), routeParams);

    expect(response.status).toBe(200);
    expect(assignmentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { dueDate: new Date("2026-11-12T23:59:59.000Z") } }),
    );
  });

  it("refuses to move a completed assignment", async () => {
    assignmentFindFirstMock.mockResolvedValue({ id: "a1", status: "COMPLETED" });

    const response = await PATCH(patchRequest({ dueDate: "2026-11-12T23:59:59.000Z" }), routeParams);

    expect(response.status).toBe(409);
    expect(assignmentUpdateMock).not.toHaveBeenCalled();
  });

  it("reassigns only to an active member of the same household", async () => {
    assignmentFindFirstMock.mockResolvedValue({ id: "a1", status: "PENDING" });
    memberFindFirstMock.mockResolvedValue(null);

    const response = await PATCH(patchRequest({ memberId: "m-other-house" }), routeParams);

    expect(response.status).toBe(400);
    expect(memberFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "m-other-house", householdId: "h1", isActive: true } }),
    );
    expect(assignmentUpdateMock).not.toHaveBeenCalled();
  });

  it("keeps notes-only updates working for old clients", async () => {
    assignmentFindFirstMock.mockResolvedValue({ id: "a1", status: "COMPLETED" });

    const response = await PATCH(patchRequest({ notes: "listo" }), routeParams);

    expect(response.status).toBe(200);
    expect(memberFindFirstMock).not.toHaveBeenCalled();
  });
});
