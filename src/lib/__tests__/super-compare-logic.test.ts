import { describe, expect, it } from "vitest";

import { applyOverrides, buildSavingsSummary, isTermMissing } from "@/lib/super-compare-logic";

import type { AdjustedStoreCart } from "@/lib/super-compare-logic";
import type { StoreCart } from "@/lib/supermarket-search";

function baseCart(overrides: Partial<StoreCart> = {}): StoreCart {
  return {
    storeName: "Carrefour",
    products: [
      {
        searchTerm: "leche",
        quantity: 1,
        productName: "Leche Serenísima",
        price: 1000,
        lineTotal: 1000,
        listPrice: null,
        imageUrl: null,
        link: "https://example.com",
        isCheapest: true,
        unitInfo: null,
        alternatives: [],
        averagePrice: null,
      },
    ],
    totalPrice: 1000,
    cheapestCount: 1,
    missingTerms: [],
    totalSearched: 1,
    ...overrides,
  };
}

describe("applyOverrides", () => {
  it("recomputes line totals with the search item's quantity", () => {
    const [cart] = applyOverrides([baseCart()], new Map(), [{ term: "leche", quantity: 3 }]);
    expect(cart?.products[0]?.quantity).toBe(3);
    expect(cart?.products[0]?.lineTotal).toBe(3000);
    expect(cart?.totalPrice).toBe(3000);
  });

  it("swaps a product when an override is set and keeps the original as an alternative", () => {
    const overrides = new Map([
      [
        "Carrefour::leche",
        {
          type: "swap" as const,
          alternative: {
            productName: "Leche La Vaquita",
            price: 800,
            listPrice: null,
            link: "https://example.com/alt",
            imageUrl: null,
            unitInfo: null,
          },
        },
      ],
    ]);
    const [cart] = applyOverrides([baseCart()], overrides, [{ term: "leche", quantity: 1 }]);
    expect(cart?.products[0]?.productName).toBe("Leche La Vaquita");
    expect(cart?.products[0]?.lineTotal).toBe(800);
    expect(cart?.products[0]?.alternatives[0]?.productName).toBe("Leche Serenísima");
  });
});

describe("buildSavingsSummary", () => {
  it("returns the gap between the best cart and the runner-up", () => {
    const carts: AdjustedStoreCart[] = [baseCart({ totalPrice: 1000 }), baseCart({ storeName: "Coto", totalPrice: 1200 })];
    expect(buildSavingsSummary(carts)).toEqual({ savingsVsNext: 200, nextStoreName: "Coto" });
  });

  it("returns nulls with only one cart", () => {
    expect(buildSavingsSummary([baseCart()])).toEqual({ savingsVsNext: null, nextStoreName: null });
  });
});

describe("isTermMissing", () => {
  it("is accent/case-insensitive", () => {
    const cart = baseCart({ missingTerms: ["Fideos"] });
    expect(isTermMissing(cart, "fídeos")).toBe(true);
  });

  it("is false when the term isn't in missingTerms", () => {
    const cart = baseCart({ missingTerms: ["Fideos"] });
    expect(isTermMissing(cart, "arroz")).toBe(false);
  });
});
