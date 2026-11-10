import { afterEach, describe, expect, it, vi } from "vitest";

const { findManyMock } = vi.hoisted(() => ({ findManyMock: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: { member: { findMany: findManyMock } },
}));

import { resolveMcpMember, mcpMemberErrorToToolResult } from "../resolve-member";

function membership(overrides: { id: string; householdId: string; householdName: string }) {
  return {
    id: overrides.id,
    userId: "user-1",
    householdId: overrides.householdId,
    household: { id: overrides.householdId, name: overrides.householdName },
  };
}

describe("resolveMcpMember", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns no_household when the user has zero active memberships", async () => {
    findManyMock.mockResolvedValue([]);
    const result = await resolveMcpMember("user-1");
    expect(result).toEqual({ kind: "no_household" });
  });

  it("returns ok with the single membership when the user has exactly one", async () => {
    const only = membership({ id: "member-1", householdId: "house-a", householdName: "Casa A" });
    findManyMock.mockResolvedValue([only]);

    const result = await resolveMcpMember("user-1");

    expect(result).toEqual({ kind: "ok", member: only });
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1", isActive: true } }),
    );
  });

  it("returns ambiguous with {id, name} households when there are several and none is given", async () => {
    const a = membership({ id: "member-1", householdId: "house-a", householdName: "Casa A" });
    const b = membership({ id: "member-2", householdId: "house-b", householdName: "Casa B" });
    findManyMock.mockResolvedValue([a, b]);

    const result = await resolveMcpMember("user-1");

    expect(result).toEqual({
      kind: "ambiguous",
      households: [
        { id: "house-a", name: "Casa A" },
        { id: "house-b", name: "Casa B" },
      ],
    });
  });

  it("returns ok for the matching membership when householdId is given among several", async () => {
    const a = membership({ id: "member-1", householdId: "house-a", householdName: "Casa A" });
    const b = membership({ id: "member-2", householdId: "house-b", householdName: "Casa B" });
    findManyMock.mockResolvedValue([a, b]);

    const result = await resolveMcpMember("user-1", "house-b");

    expect(result).toEqual({ kind: "ok", member: b });
  });

  it("returns not_a_member for a foreign householdId, never leaking data", async () => {
    const a = membership({ id: "member-1", householdId: "house-a", householdName: "Casa A" });
    findManyMock.mockResolvedValue([a]);

    const result = await resolveMcpMember("user-1", "house-does-not-belong-to-user");

    expect(result).toEqual({ kind: "not_a_member" });
  });

  it("excludes inactive memberships via the isActive filter", async () => {
    findManyMock.mockResolvedValue([]);
    await resolveMcpMember("user-1");

    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1", isActive: true } }));
  });
});

describe("mcpMemberErrorToToolResult", () => {
  it("marks every error kind as isError with text content", () => {
    expect(mcpMemberErrorToToolResult({ kind: "no_household" }).isError).toBe(true);
    expect(mcpMemberErrorToToolResult({ kind: "not_a_member" }).isError).toBe(true);
    expect(mcpMemberErrorToToolResult({ kind: "ambiguous", households: [{ id: "a", name: "A" }] }).isError).toBe(true);
  });
});
