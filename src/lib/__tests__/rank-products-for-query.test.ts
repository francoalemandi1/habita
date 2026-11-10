import { describe, expect, it } from "vitest";

import { rankProductsForQuery } from "@habita/prices";

import type { StoreProduct } from "@habita/prices";

function product(productName: string, price: number): StoreProduct {
  return { productName, price, listPrice: null, link: `/p/${productName}`, imageUrl: null };
}

describe("rankProductsForQuery", () => {
  it("ranks exact match first, then startsWith over includes, then price tiebreak", () => {
    const products = [
      product("Flan con dulce de leche", 500),
      product("Leche descremada La Serenisima 1L", 2000),
      product("Leche La Serenisima clasica 1L", 2269),
      product("Leche entera 1L", 1800),
      product("Leche", 1200),
    ];

    const ranked = rankProductsForQuery("leche", products, 8);

    expect(ranked.map((p) => p.productName)).toEqual([
      "Leche",
      "Leche entera 1L",
      "Leche descremada La Serenisima 1L",
      "Leche La Serenisima clasica 1L",
      "Flan con dulce de leche",
    ]);
  });

  it("breaks ties between equal scores by price ascending", () => {
    const products = [product("Leche entera 1L", 2000), product("Leche entera 500ml", 1200)];
    const ranked = rankProductsForQuery("leche entera", products, 8);
    expect(ranked.map((p) => p.price)).toEqual([1200, 2000]);
  });

  it("respects the limit", () => {
    const products = [product("Leche a", 100), product("Leche b", 200), product("Leche c", 300)];
    expect(rankProductsForQuery("leche", products, 2)).toHaveLength(2);
  });

  it("carries cartRef through when present", () => {
    const withRef: StoreProduct = { ...product("Leche entera 1L", 2000), cartRef: { skuId: "1", sellerId: "1" } };
    const ranked = rankProductsForQuery("leche", [withRef], 8);
    expect(ranked[0]?.cartRef).toEqual({ skuId: "1", sellerId: "1" });
  });
});
