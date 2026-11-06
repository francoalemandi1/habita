import { describe, it, expect } from "vitest";
import { extractShoppingListPendingId } from "@/lib/offline-shopping-pending-id";

describe("extractShoppingListPendingId", () => {
  it("maps an update mutation's itemId directly", () => {
    expect(extractShoppingListPendingId({ itemId: "item-1", checked: true })).toBe("item-1");
  });

  it("maps an add mutation's clientId to the optimistic row id", () => {
    expect(extractShoppingListPendingId({ clientId: "abc", name: "Yerba" })).toBe("pending-abc");
  });

  it("returns an empty string for unrecognized variables", () => {
    expect(extractShoppingListPendingId({ foo: "bar" })).toBe("");
  });

  it("returns an empty string for a non-object value", () => {
    expect(extractShoppingListPendingId("item-1")).toBe("");
    expect(extractShoppingListPendingId(null)).toBe("");
  });
});
