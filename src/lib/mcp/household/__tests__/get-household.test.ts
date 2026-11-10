import { afterEach, describe, expect, it, vi } from "vitest";

const { findManyMock, resolveMcpMemberMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  resolveMcpMemberMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { member: { findMany: findManyMock } } }));
vi.mock("../resolve-member", () => ({
  resolveMcpMember: resolveMcpMemberMock,
  mcpMemberErrorToToolResult: (result: { kind: string }) => ({ isError: true, content: [{ type: "text", text: result.kind }] }),
}));

import { handleGetHousehold } from "../tools/get-household";

const identity = { userId: "user-1", scopes: new Set(["habita"]) };
const member = { id: "member-1", householdId: "house-a", household: { id: "house-a", name: "Casa A" } };

describe("handleGetHousehold", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("filters members by the resolved member's householdId", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member });
    findManyMock.mockResolvedValueOnce([{ household: { id: "house-a", name: "Casa A" } }]);
    findManyMock.mockResolvedValueOnce([{ id: "member-1", name: "Juan", memberType: "ADULT" }]);

    const result = await handleGetHousehold(identity, {});

    expect(result.isError).toBeFalsy();
    expect(findManyMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { householdId: "house-a", isActive: true } }),
    );
  });

  it("returns an error result without querying members when resolution fails", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ambiguous", households: [] });

    const result = await handleGetHousehold(identity, {});

    expect(result.isError).toBe(true);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
