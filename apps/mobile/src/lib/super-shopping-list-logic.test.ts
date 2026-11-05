import { describe, expect, it } from "vitest";
import {
  buildCompareSearchItems,
  countUnchecked,
  isDealInList,
  matchesTopDeal,
  sortShoppingListItems,
} from "./super-shopping-list-logic";

import type { ShoppingListItem, TopDealProduct } from "@habita/contracts";

function buildItem(overrides: Partial<ShoppingListItem>): ShoppingListItem {
  return {
    id: "item-1",
    name: "Leche",
    quantity: 1,
    addedBy: { id: "member-1", name: "Ana" },
    checkedAt: null,
    checkedBy: null,
    createdAt: new Date(2026, 10, 1).toISOString(),
    updatedAt: new Date(2026, 10, 1).toISOString(),
    ...overrides,
  };
}

function buildDeal(overrides: Partial<TopDealProduct>): TopDealProduct {
  return {
    store: "Coto",
    productName: "Leche entera",
    price: "$1000",
    originalPrice: null,
    discount: "10%",
    savingsPercent: 10,
    categoryLabel: "Lácteos",
    sourceUrl: "https://example.com",
    source: "coto",
    ...overrides,
  };
}

describe("sortShoppingListItems", () => {
  it("keeps unchecked first (oldest first), then checked (oldest checked first)", () => {
    const unchecked2 = buildItem({ id: "u2", createdAt: new Date(2026, 10, 2).toISOString() });
    const unchecked1 = buildItem({ id: "u1", createdAt: new Date(2026, 10, 1).toISOString() });
    const checked2 = buildItem({ id: "c2", checkedAt: new Date(2026, 10, 3).toISOString() });
    const checked1 = buildItem({ id: "c1", checkedAt: new Date(2026, 10, 2).toISOString() });

    const sorted = sortShoppingListItems([checked2, unchecked2, checked1, unchecked1]);
    expect(sorted.map((item) => item.id)).toEqual(["u1", "u2", "c1", "c2"]);
  });
});

describe("countUnchecked", () => {
  it("counts only items without checkedAt", () => {
    const items = [buildItem({ id: "a" }), buildItem({ id: "b", checkedAt: new Date().toISOString() })];
    expect(countUnchecked(items)).toBe(1);
  });
});

describe("buildCompareSearchItems", () => {
  it("maps unchecked items to search terms, clamping quantity", () => {
    const items = [
      buildItem({ id: "a", name: "Leche", quantity: 150 }),
      buildItem({ id: "b", name: "Pan", checkedAt: new Date().toISOString() }),
    ];
    expect(buildCompareSearchItems(items)).toEqual([{ term: "Leche", quantity: 99 }]);
  });
});

describe("matchesTopDeal", () => {
  it("matches accent- and case-insensitive substrings in either direction", () => {
    const deals = [buildDeal({ productName: "Leche Entera La Serenísima" })];
    expect(matchesTopDeal("leche entera", deals)).toBe(true);
    expect(matchesTopDeal("pan", deals)).toBe(false);
  });
});

describe("isDealInList", () => {
  it("matches an unchecked item with the same normalized name", () => {
    const items = [buildItem({ id: "a", name: "Café" })];
    expect(isDealInList("cafe", items)).toBe(true);
  });

  it("ignores checked items", () => {
    const items = [buildItem({ id: "a", name: "Café", checkedAt: new Date().toISOString() })];
    expect(isDealInList("cafe", items)).toBe(false);
  });
});
