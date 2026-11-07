import { describe, expect, it } from "vitest";
import { normalizeShoppingListItemName } from "@/lib/shopping-list";

describe("normalizeShoppingListItemName", () => {
  it("lowercases the name", () => {
    expect(normalizeShoppingListItemName("Leche")).toBe("leche");
  });

  it("strips accents", () => {
    expect(normalizeShoppingListItemName("Café")).toBe("cafe");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeShoppingListItemName("papel   higienico")).toBe("papel higienico");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeShoppingListItemName("  Yerba  ")).toBe("yerba");
  });

  it("treats accented and plain variants as equal", () => {
    expect(normalizeShoppingListItemName("Café")).toBe(normalizeShoppingListItemName("cafe"));
  });
});
