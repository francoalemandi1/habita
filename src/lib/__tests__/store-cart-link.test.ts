import { describe, expect, it } from "vitest";

import { CART_ADD_STORE_BASE_URLS, buildStoreCartUrl } from "@habita/prices";

import { SUPERMARKET_STORES } from "@/lib/vtex-client";

describe("CART_ADD_STORE_BASE_URLS", () => {
  it("matches name and baseUrl from SUPERMARKET_STORES for every supported store", () => {
    for (const [storeName, baseUrl] of Object.entries(CART_ADD_STORE_BASE_URLS)) {
      const store = SUPERMARKET_STORES.find((candidate) => candidate.name === storeName);
      expect(store).toBeDefined();
      expect(store?.baseUrl).toBe(baseUrl);
    }
  });

  it("lists exactly the 5 VTEX stores known to support the cart-add URL", () => {
    expect(Object.keys(CART_ADD_STORE_BASE_URLS).sort()).toEqual(
      ["Cordiez", "Dia", "Carrefour", "Mas Online", "Toledo"].sort(),
    );
  });
});

describe("buildStoreCartUrl", () => {
  const refA = { cartRef: { skuId: "111", sellerId: "1" }, quantity: 2 };
  const refB = { cartRef: { skuId: "222", sellerId: "1" }, quantity: 1 };

  it("returns null for an unsupported store", () => {
    expect(buildStoreCartUrl("Disco", [refA])).toBeNull();
  });

  it("returns null when no product has a cartRef", () => {
    expect(buildStoreCartUrl("Carrefour", [{ cartRef: null, quantity: 1 }])).toBeNull();
  });

  it("counts only the products with a cartRef when refs are mixed", () => {
    const link = buildStoreCartUrl("Carrefour", [refA, { cartRef: null, quantity: 1 }]);
    expect(link).toEqual({
      url: "https://www.carrefour.com.ar/checkout/cart/add?sku=111&qty=2&seller=1&sc=1",
      includedCount: 1,
      totalCount: 2,
    });
  });

  it("floors and clamps quantity to at least 1", () => {
    const link = buildStoreCartUrl("Carrefour", [{ cartRef: refA.cartRef, quantity: 0.4 }]);
    expect(link?.url).toContain("qty=1");
  });

  it("builds the exact URL shape for 2 products, in order", () => {
    const link = buildStoreCartUrl("Toledo", [refA, refB]);
    expect(link).toEqual({
      url: "https://www.toledodigital.com.ar/checkout/cart/add?sku=111&qty=2&seller=1&sku=222&qty=1&seller=1&sc=1",
      includedCount: 2,
      totalCount: 2,
    });
  });

  // Carrefour sorts skus (as strings) and quantities on their own before pairing them.
  it("returns null on Carrefour when independent sorting would move quantities", () => {
    expect(buildStoreCartUrl("Carrefour", [refA, refB])).toBeNull();
  });

  it("keeps the Carrefour link when every quantity is the same", () => {
    const link = buildStoreCartUrl("Carrefour", [refA, { ...refB, quantity: 2 }]);
    expect(link?.includedCount).toBe(2);
  });

  it("uses string order for Carrefour skus: '144373' sorts before '25341'", () => {
    const milk = { cartRef: { skuId: "144373", sellerId: "1" }, quantity: 1 };
    const yerba = { cartRef: { skuId: "25341", sellerId: "1" }, quantity: 3 };
    expect(buildStoreCartUrl("Carrefour", [yerba, milk])?.includedCount).toBe(2);
    expect(buildStoreCartUrl("Carrefour", [{ ...milk, quantity: 3 }, { ...yerba, quantity: 1 }])).toBeNull();
  });
});
