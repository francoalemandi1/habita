import { describe, expect, it } from "vitest";

import {
  buildCompareSearchItems,
  countUnchecked,
  isDealInList,
  matchesTopDeal,
  sortShoppingListItems,
} from "@habita/prices";

import type { ShoppingListItem } from "@habita/contracts";
import type { TopDealProduct } from "@habita/contracts";

const member = { id: "m1", name: "Sofi" };

function item(overrides: Partial<ShoppingListItem>): ShoppingListItem {
  return {
    id: "i1",
    name: "Leche",
    quantity: 1,
    addedBy: member,
    checkedAt: null,
    checkedBy: null,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("sortShoppingListItems", () => {
  it("keeps unchecked items first, ordered by createdAt", () => {
    const a = item({ id: "a", createdAt: "2026-11-01T10:00:00.000Z" });
    const b = item({ id: "b", createdAt: "2026-11-01T09:00:00.000Z" });
    const result = sortShoppingListItems([a, b]);
    expect(result.map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("moves checked items to the end, ordered by checkedAt", () => {
    const unchecked = item({ id: "u", createdAt: "2026-11-01T10:00:00.000Z" });
    const checkedLater = item({ id: "c1", checkedAt: "2026-11-01T12:00:00.000Z" });
    const checkedEarlier = item({ id: "c2", checkedAt: "2026-11-01T11:00:00.000Z" });
    const result = sortShoppingListItems([checkedLater, unchecked, checkedEarlier]);
    expect(result.map((i) => i.id)).toEqual(["u", "c2", "c1"]);
  });
});

describe("countUnchecked", () => {
  it("counts only items without checkedAt", () => {
    const items = [item({ id: "a" }), item({ id: "b", checkedAt: "2026-11-01T11:00:00.000Z" })];
    expect(countUnchecked(items)).toBe(1);
  });
});

describe("buildCompareSearchItems", () => {
  it("builds term+quantity pairs from unchecked items only", () => {
    const items = [
      item({ id: "a", name: "Leche", quantity: 2 }),
      item({ id: "b", name: "Pan", checkedAt: "2026-11-01T11:00:00.000Z" }),
    ];
    expect(buildCompareSearchItems(items)).toEqual([{ term: "Leche", quantity: 2 }]);
  });

  it("clamps quantity to the 1-99 range", () => {
    const items = [item({ id: "a", quantity: 150 })];
    expect(buildCompareSearchItems(items)[0]?.quantity).toBe(99);
  });
});

const deals: TopDealProduct[] = [
  {
    productName: "Leche La Serenísima 1L",
    store: "Carrefour",
    price: "$1000",
    originalPrice: null,
    discount: "10%",
    savingsPercent: 10,
    categoryLabel: "Lácteos",
    sourceUrl: "https://example.com",
    source: "carrefour",
  },
];

describe("matchesTopDeal", () => {
  it("matches when the list item name is a substring of the deal name", () => {
    expect(matchesTopDeal("leche", deals)).toBe(true);
  });

  it("is accent-insensitive", () => {
    expect(matchesTopDeal("LÉCHE", deals)).toBe(true);
  });

  it("returns false with no match", () => {
    expect(matchesTopDeal("fideos", deals)).toBe(false);
  });
});

describe("isDealInList", () => {
  it("is true when an unchecked item matches the deal name exactly (normalized)", () => {
    const items = [item({ id: "a", name: "leche" })];
    expect(isDealInList("Leche", items)).toBe(true);
  });

  it("is accent-insensitive", () => {
    const items = [item({ id: "a", name: "Café" })];
    expect(isDealInList("cafe", items)).toBe(true);
  });

  it("is false when the matching item is already checked", () => {
    const items = [item({ id: "a", name: "leche", checkedAt: "2026-11-01T11:00:00.000Z" })];
    expect(isDealInList("Leche", items)).toBe(false);
  });
});
