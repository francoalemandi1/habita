import { afterEach, describe, expect, it, vi } from "vitest";

const { findManyMock, resolveMcpMemberMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  resolveMcpMemberMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { shoppingListItem: { findMany: findManyMock } } }));
vi.mock("../resolve-member", () => ({
  resolveMcpMember: resolveMcpMemberMock,
  mcpMemberErrorToToolResult: (result: { kind: string }) => ({ isError: true, content: [{ type: "text", text: result.kind }] }),
}));

import { handleGetShoppingList } from "../tools/get-shopping-list";

const identity = { userId: "user-1", scopes: new Set(["habita"]) };
const member = { id: "member-1", householdId: "house-a" };

describe("handleGetShoppingList", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("filters items by the member's householdId", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member });
    findManyMock.mockResolvedValue([{ id: "item-1", name: "Leche", quantity: 2, checkedAt: null }]);

    const result = await handleGetShoppingList(identity, {});

    expect(result.isError).toBeFalsy();
    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ where: { householdId: "house-a" } }));
  });

  it("returns an error result without querying when resolution fails", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "not_a_member" });

    const result = await handleGetShoppingList(identity, { householdId: "house-b" });

    expect(result.isError).toBe(true);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
