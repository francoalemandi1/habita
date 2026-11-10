import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { setShoppingListItemCheckedMock, resolveMcpMemberMock } = vi.hoisted(() => ({
  setShoppingListItemCheckedMock: vi.fn(),
  resolveMcpMemberMock: vi.fn(),
}));

vi.mock("@/lib/shopping-list-service", () => ({ setShoppingListItemChecked: setShoppingListItemCheckedMock }));
vi.mock("../resolve-member", () => ({
  resolveMcpMember: resolveMcpMemberMock,
  mcpMemberErrorToToolResult: (result: { kind: string }) => ({ isError: true, content: [{ type: "text", text: result.kind }] }),
}));

import { handleSetShoppingListItemChecked, setShoppingListItemCheckedInputSchema } from "../tools/set-shopping-list-item-checked";

const identity = { userId: "user-1", scopes: new Set(["habita"]) };
const member = { id: "member-1", householdId: "house-a" };

describe("handleSetShoppingListItemChecked", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("resolves the member using the given householdId and updates the item", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member });
    setShoppingListItemCheckedMock.mockResolvedValueOnce({
      id: "item-1",
      name: "Leche",
      quantity: 1,
      checkedAt: new Date("2026-01-02"),
    });

    const result = await handleSetShoppingListItemChecked(identity, {
      householdId: "house-a",
      itemId: "item-1",
      checked: true,
    });

    expect(result.isError).toBeFalsy();
    expect(resolveMcpMemberMock).toHaveBeenCalledWith("user-1", "house-a");
    expect(setShoppingListItemCheckedMock).toHaveBeenCalledWith({
      householdId: "house-a",
      itemId: "item-1",
      memberId: "member-1",
      checked: true,
    });
    if (result.content[0]?.type !== "text") throw new Error("Expected text content");
    expect(JSON.parse(result.content[0].text)).toEqual({
      item: { id: "item-1", name: "Leche", quantity: 1, checked: true },
    });
  });

  it("returns an error result without updating when resolution fails", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "not_a_member" });

    const result = await handleSetShoppingListItemChecked(identity, { itemId: "item-1", checked: true });

    expect(result.isError).toBe(true);
    expect(setShoppingListItemCheckedMock).not.toHaveBeenCalled();
  });

  it("returns isError 'Item not found in this household.' when the item doesn't exist", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member });
    setShoppingListItemCheckedMock.mockResolvedValueOnce(null);

    const result = await handleSetShoppingListItemChecked(identity, { itemId: "item-missing", checked: true });

    expect(result.isError).toBe(true);
    if (result.content[0]?.type !== "text") throw new Error("Expected text content");
    expect(result.content[0].text).toBe("Item not found in this household.");
  });
});

describe("setShoppingListItemCheckedInputSchema", () => {
  it("rejects a missing itemId", () => {
    const result = z.object(setShoppingListItemCheckedInputSchema).safeParse({ checked: true });

    expect(result.success).toBe(false);
  });

  it("rejects a missing checked flag", () => {
    const result = z.object(setShoppingListItemCheckedInputSchema).safeParse({ itemId: "item-1" });

    expect(result.success).toBe(false);
  });
});
