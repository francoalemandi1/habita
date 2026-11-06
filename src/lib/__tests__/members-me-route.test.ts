import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getCurrentMemberMock, memberUpdateMock } = vi.hoisted(() => ({
  getCurrentMemberMock: vi.fn(),
  memberUpdateMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getCurrentMember: getCurrentMemberMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { member: { update: memberUpdateMock } } }));

import { PATCH } from "@/app/api/members/me/route";

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/members/me", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("PATCH /api/members/me", () => {
  beforeEach(() => {
    getCurrentMemberMock.mockResolvedValue({ id: "member-1" });
    memberUpdateMock.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "member-1", ...data }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects quietHoursStart without quietHoursEnd", async () => {
    const response = await PATCH(buildRequest({ quietHoursStart: 22 }));
    expect(response.status).toBe(400);
    expect(memberUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects an out-of-range quiet hour", async () => {
    const response = await PATCH(buildRequest({ quietHoursStart: 24, quietHoursEnd: 8 }));
    expect(response.status).toBe(400);
  });

  it("rejects equal quietHoursStart and quietHoursEnd", async () => {
    const response = await PATCH(buildRequest({ quietHoursStart: 10, quietHoursEnd: 10 }));
    expect(response.status).toBe(400);
  });

  it("accepts a valid cross-midnight quiet hours window", async () => {
    const response = await PATCH(buildRequest({ quietHoursStart: 23, quietHoursEnd: 8 }));
    expect(response.status).toBe(200);
    expect(memberUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quietHoursStart: 23, quietHoursEnd: 8 } }),
    );
  });

  it("accepts clearing quiet hours with both null", async () => {
    const response = await PATCH(buildRequest({ quietHoursStart: null, quietHoursEnd: null }));
    expect(response.status).toBe(200);
  });

  it("rejects an availability payload with an invalid weekday key", async () => {
    const response = await PATCH(buildRequest({ availability: { "8": ["morning"] } }));
    expect(response.status).toBe(400);
  });

  it("rejects an availability payload with an invalid slot value", async () => {
    const response = await PATCH(buildRequest({ availability: { "1": ["night"] } }));
    expect(response.status).toBe(400);
  });

  it("accepts a valid availability payload, including an empty-slot weekday", async () => {
    const response = await PATCH(
      buildRequest({ availability: { "1": [], "2": ["morning", "evening"] } }),
    );
    expect(response.status).toBe(200);
  });

  it("accepts clearing availability with null", async () => {
    const response = await PATCH(buildRequest({ availability: null }));
    expect(response.status).toBe(200);
  });
});
