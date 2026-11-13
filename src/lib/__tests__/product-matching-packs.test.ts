import { describe, expect, it } from "vitest";

import { buildStoreCarts, packsToBuy } from "@habita/prices";

import type { SearchItem, StoreProduct, TermResult } from "@habita/prices";

describe("packsToBuy", () => {
  it("rounds up to the number of packs needed for a declared pack count", () => {
    expect(packsToBuy(12, "Huevo Blanco Grande 6 Ud.")).toBe(2);
  });

  it("rounds up partial packs", () => {
    expect(packsToBuy(13, "Huevo Blanco Grande 6 Ud.")).toBe(3);
  });

  it("buys at least one pack when requesting fewer units than the pack holds", () => {
    expect(packsToBuy(1, "Papel Higiénico Simple Hoja 80mts 2 Ud.")).toBe(1);
  });

  it("falls back to the requested quantity for a weight/volume product", () => {
    expect(packsToBuy(2, "Leche Entera DIA Sachet 1 Lt.")).toBe(2);
  });

  it("falls back to the requested quantity when no pack count is declared", () => {
    expect(packsToBuy(3, "Fideos Tirabuzón 500 g")).toBe(3);
  });
});

function storeProduct(overrides: Partial<StoreProduct> = {}): StoreProduct {
  return {
    productName: "Huevo Blanco Grande 6 Ud.",
    price: 2390,
    listPrice: null,
    link: "https://example.com",
    imageUrl: null,
    ...overrides,
  };
}

function termResult(product: StoreProduct): TermResult {
  return { product, unitInfo: null, alternatives: [] };
}

describe("buildStoreCarts pack counts", () => {
  const searchItems: SearchItem[] = [{ term: "huevos", quantity: 12 }];

  it("converts a requested unit quantity into packs for the matched product", () => {
    const storeResults = new Map([["Carrefour", new Map([["huevos", termResult(storeProduct())]])]]);
    const { storeCarts } = buildStoreCarts(searchItems, storeResults);
    const product = storeCarts[0]?.products[0];
    expect(product?.quantity).toBe(2);
    expect(product?.lineTotal).toBe(2 * 2390);
  });

  it("keeps the originally requested unit quantity alongside the packs to buy", () => {
    const storeResults = new Map([["Carrefour", new Map([["huevos", termResult(storeProduct())]])]]);
    const { storeCarts } = buildStoreCarts(searchItems, storeResults);
    const product = storeCarts[0]?.products[0];
    expect(product?.requestedQuantity).toBe(12);
  });

  it("picks the cheapest store by line total for the requested quantity, not by unit price", () => {
    // Carrefour: a 6-pack at 2390 -> 2 packs needed -> lineTotal 4780
    // Dia: a 30-pack at 10000 -> 1 pack needed -> lineTotal 10000 (unit price is lower, but the pack is way oversized)
    const storeResults = new Map([
      ["Carrefour", new Map([["huevos", termResult(storeProduct({ productName: "Huevo Blanco Grande 6 Ud.", price: 2390 }))]])],
      ["Dia", new Map([["huevos", termResult(storeProduct({ productName: "Huevos Color x 30 un", price: 10000 }))]])],
    ]);
    const { storeCarts } = buildStoreCarts(searchItems, storeResults);
    const carrefourProduct = storeCarts.find((c) => c.storeName === "Carrefour")?.products[0];
    const diaProduct = storeCarts.find((c) => c.storeName === "Dia")?.products[0];
    expect(carrefourProduct?.isCheapest).toBe(true);
    expect(diaProduct?.isCheapest).toBe(false);
  });

  it("leaves weight/volume products unchanged (packs == requested quantity)", () => {
    const weightItems: SearchItem[] = [{ term: "leche", quantity: 2 }];
    const storeResults = new Map([
      ["Carrefour", new Map([["leche", termResult(storeProduct({ productName: "Leche Entera DIA Sachet 1 Lt.", price: 1000 }))]])],
    ]);
    const { storeCarts } = buildStoreCarts(weightItems, storeResults);
    const product = storeCarts[0]?.products[0];
    expect(product?.quantity).toBe(2);
    expect(product?.lineTotal).toBe(2000);
  });
});
