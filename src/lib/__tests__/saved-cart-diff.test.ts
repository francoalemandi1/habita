import { describe, expect, it } from "vitest";
import { diffCartPrices } from "@/lib/saved-cart-diff";

import type { CartProduct } from "@/lib/supermarket-search";

function makeCartProduct(overrides: Partial<CartProduct>): CartProduct {
  return {
    searchTerm: "leche",
    quantity: 1,
    productName: "Leche entera 1L",
    price: 1000,
    lineTotal: 1000,
    listPrice: null,
    imageUrl: null,
    link: "https://example.com",
    isCheapest: true,
    unitInfo: null,
    alternatives: [],
    averagePrice: null,
    ...overrides,
  };
}

describe("diffCartPrices", () => {
  it("returns only terms whose price changed", () => {
    const stored = [
      makeCartProduct({ searchTerm: "leche", price: 1000 }),
      makeCartProduct({ searchTerm: "pan", productName: "Pan lactal", price: 500 }),
    ];
    const fresh: CartProduct[] = [
      makeCartProduct({ searchTerm: "leche", price: 1200 }),
      makeCartProduct({ searchTerm: "pan", productName: "Pan lactal", price: 500 }),
    ];

    const changes = diffCartPrices(stored, fresh);

    expect(changes).toEqual([
      { term: "leche", productName: "Leche entera 1L", previousPrice: 1000, currentPrice: 1200 },
    ]);
  });

  it("ignores terms that are not present in the stored products", () => {
    const stored = [makeCartProduct({ searchTerm: "leche", price: 1000 })];
    const fresh: CartProduct[] = [makeCartProduct({ searchTerm: "yerba", price: 2000 })];

    expect(diffCartPrices(stored, fresh)).toEqual([]);
  });

  it("returns no changes for invalid or legacy-shaped stored JSON", () => {
    const fresh: CartProduct[] = [makeCartProduct({ searchTerm: "leche", price: 1200 })];

    expect(diffCartPrices(null, fresh)).toEqual([]);
    expect(diffCartPrices({ not: "an array" }, fresh)).toEqual([]);
    expect(diffCartPrices([{ incomplete: true }], fresh)).toEqual([]);
  });

  it("ignores sub-cent price differences", () => {
    const stored = [makeCartProduct({ searchTerm: "leche", price: 1000 })];
    const fresh: CartProduct[] = [makeCartProduct({ searchTerm: "leche", price: 1000.005 })];

    expect(diffCartPrices(stored, fresh)).toEqual([]);
  });
});
