import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { BadRequestError } from "@/lib/errors";

const { addShoppingListItemMock, resolveMcpMemberMock } = vi.hoisted(() => ({
  addShoppingListItemMock: vi.fn(),
  resolveMcpMemberMock: vi.fn(),
}));

vi.mock("@/lib/shopping-list-service", () => ({ addShoppingListItem: addShoppingListItemMock }));
vi.mock("../resolve-member", () => ({
  resolveMcpMember: resolveMcpMemberMock,
  mcpMemberErrorToToolResult: (result: { kind: string }) => ({ isError: true, content: [{ type: "text", text: result.kind }] }),
}));

import { handleAddShoppingListItems, addShoppingListItemsInputSchema } from "../tools/add-shopping-list-items";

const identity = { userId: "user-1", scopes: new Set(["habita"]) };
const member = { id: "member-1", householdId: "house-a" };

function buildItem(overrides: Record<string, unknown> = {}) {
  return { id: "item-1", name: "Leche", quantity: 1, checkedAt: null, ...overrides };
}

describe("handleAddShoppingListItems", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("resolves the member using the given householdId and adds each item", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member });
    addShoppingListItemMock.mockResolvedValueOnce(buildItem());

    const result = await handleAddShoppingListItems(identity, {
      householdId: "house-a",
      items: [{ name: "Leche", clientId: "client-abc-123" }],
    });

    expect(result.isError).toBeFalsy();
    expect(resolveMcpMemberMock).toHaveBeenCalledWith("user-1", "house-a");
    expect(addShoppingListItemMock).toHaveBeenCalledWith(
      expect.objectContaining({ householdId: "house-a", addedById: "member-1", quantity: 1 }),
    );
  });

  it("returns an error result without adding items when resolution fails", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "not_a_member" });

    const result = await handleAddShoppingListItems(identity, { items: [{ name: "Leche", clientId: "client-abc-123" }] });

    expect(result.isError).toBe(true);
    expect(addShoppingListItemMock).not.toHaveBeenCalled();
  });

  it("marks one item ok:false with its message on BadRequestError while the rest continue", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member });
    addShoppingListItemMock
      .mockRejectedValueOnce(new BadRequestError("La lista ya tiene 200 productos"))
      .mockResolvedValueOnce(buildItem({ id: "item-2", name: "Pan" }));

    const result = await handleAddShoppingListItems(identity, {
      items: [
        { name: "Leche", clientId: "client-abc-123" },
        { name: "Pan", clientId: "client-def-456" },
      ],
    });

    expect(result.isError).toBeFalsy();
    if (result.content[0]?.type !== "text") throw new Error("Expected text content");
    const parsed: { results: Array<{ clientId: string; ok: boolean; error?: string }> } = JSON.parse(
      result.content[0].text,
    );
    expect(parsed.results).toEqual([
      { clientId: "client-abc-123", ok: false, error: "La lista ya tiene 200 productos" },
      { clientId: "client-def-456", ok: true, item: { id: "item-2", name: "Pan", quantity: 1, checked: false } },
    ]);
  });

  it("fails the whole call on a non-BadRequestError", async () => {
    resolveMcpMemberMock.mockResolvedValue({ kind: "ok", member });
    addShoppingListItemMock.mockRejectedValueOnce(new Error("db down"));

    const result = await handleAddShoppingListItems(identity, { items: [{ name: "Leche", clientId: "client-abc-123" }] });

    expect(result.isError).toBe(true);
  });
});

describe("addShoppingListItemsInputSchema", () => {
  it("rejects more than 20 items", () => {
    const items = Array.from({ length: 21 }, (_, i) => ({ name: `Item ${i}`, clientId: `client-${i}-000000` }));
    const result = z.object(addShoppingListItemsInputSchema).safeParse({ items });

    expect(result.success).toBe(false);
  });

  it("rejects an item missing clientId", () => {
    const result = z.object(addShoppingListItemsInputSchema).safeParse({ items: [{ name: "Leche" }] });

    expect(result.success).toBe(false);
  });
});
