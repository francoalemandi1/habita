import { describe, expect, it } from "vitest";

import {
  applyOverrides,
  buildSavingsSummary,
  buildStoreCartUrl,
  formatCartQuantity,
  isTermMissing,
  pickBestPromoOverall,
  pickTodaysPromos,
} from "@habita/prices";

import type { AdjustedStoreCart, PromoLike, StoreCart } from "@habita/prices";

interface TestPromo extends PromoLike {
  storeName: string;
  bankDisplayName: string;
}

function promo(overrides: Partial<TestPromo> = {}): TestPromo {
  return {
    storeName: "Dia",
    bankSlug: "santander",
    bankDisplayName: "Santander",
    discountPercent: 20,
    capAmount: null,
    daysOfWeek: "[]",
    validUntil: null,
    ...overrides,
  };
}

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

  it("carries the alternative's cartRef into the cart link and keeps the original's on the swapped-out product", () => {
    const originalRef = { skuId: "111", sellerId: "1" };
    const alternativeRef = { skuId: "222", sellerId: "1" };
    const cartWithRef = baseCart();
    const [firstProduct] = cartWithRef.products;
    if (firstProduct) firstProduct.cartRef = originalRef;
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
            cartRef: alternativeRef,
          },
        },
      ],
    ]);
    const [cart] = applyOverrides([cartWithRef], overrides, [{ term: "leche", quantity: 2 }]);
    expect(cart?.products[0]?.cartRef).toEqual(alternativeRef);
    expect(cart?.products[0]?.alternatives[0]?.cartRef).toEqual(originalRef);
    expect(buildStoreCartUrl("Carrefour", cart?.products ?? [])?.url).toContain("sku=222&qty=2");
  });
});

describe("applyOverrides pack counts", () => {
  function eggsCart(overrides: Partial<StoreCart> = {}): StoreCart {
    return baseCart({
      products: [
        {
          searchTerm: "huevos",
          quantity: 1,
          productName: "Huevo Blanco Grande 6 Ud.",
          price: 2390,
          lineTotal: 2390,
          listPrice: null,
          imageUrl: null,
          link: "https://example.com",
          isCheapest: true,
          unitInfo: null,
          alternatives: [],
          averagePrice: null,
        },
      ],
      ...overrides,
    });
  }

  it("computes packs for a 6-pack product from the requested unit quantity", () => {
    const [cart] = applyOverrides([eggsCart()], new Map(), [{ term: "huevos", quantity: 12 }]);
    expect(cart?.products[0]?.quantity).toBe(2);
    expect(cart?.products[0]?.lineTotal).toBe(2 * 2390);
  });

  it("keeps packs stable when the term is missing from the list (uses the stored requested units)", () => {
    const packed = eggsCart();
    const product = packed.products[0];
    if (!product) throw new Error("fixture has no product");
    const stored: StoreCart = { ...packed, products: [{ ...product, quantity: 2, requestedQuantity: 12, lineTotal: 4780 }] };
    const [cart] = applyOverrides([stored], new Map(), []);
    expect(cart?.products[0]?.quantity).toBe(2);
  });

  it("computes packs for the swapped alternative using its own pack count", () => {
    const overrides = new Map([
      [
        "Carrefour::huevos",
        {
          type: "swap" as const,
          alternative: {
            productName: "Huevos Color x 30 un",
            price: 10000,
            listPrice: null,
            link: "https://example.com/alt",
            imageUrl: null,
            unitInfo: null,
          },
        },
      ],
    ]);
    const [cart] = applyOverrides([eggsCart()], overrides, [{ term: "huevos", quantity: 12 }]);
    expect(cart?.products[0]?.quantity).toBe(1);
    expect(cart?.products[0]?.lineTotal).toBe(10000);
  });
});

describe("applyOverrides requestedQuantity", () => {
  it("carries the requested unit quantity on the base product", () => {
    const [cart] = applyOverrides([baseCart()], new Map(), [{ term: "leche", quantity: 3 }]);
    expect(cart?.products[0]?.requestedQuantity).toBe(3);
  });
});

describe("formatCartQuantity", () => {
  it("shows packs and requested units when they differ", () => {
    expect(formatCartQuantity({ quantity: 2, requestedQuantity: 12 })).toBe("×2 · 12 u.");
  });

  it("shows just the pack count when it matches the requested quantity", () => {
    expect(formatCartQuantity({ quantity: 2, requestedQuantity: 2 })).toBe("×2");
  });

  it("shows just the pack count when there's no requestedQuantity", () => {
    expect(formatCartQuantity({ quantity: 2 })).toBe("×2");
  });

  it("shows nothing for a single unit with no difference", () => {
    expect(formatCartQuantity({ quantity: 1 })).toBe("");
    expect(formatCartQuantity({ quantity: 1, requestedQuantity: 1 })).toBe("");
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

  it("returns nulls with no carts", () => {
    expect(buildSavingsSummary([])).toEqual({ savingsVsNext: null, nextStoreName: null });
  });
});

describe("pickTodaysPromos", () => {
  const carts = [{ storeName: "Dia", totalPrice: 10000 }];
  const thursday = new Date("2026-11-12T12:00:00Z");

  it("only considers preferred banks", () => {
    const promos = [promo({ bankSlug: "santander" }), promo({ bankSlug: "macro", discountPercent: 50 })];
    const picks = pickTodaysPromos(carts, promos, ["santander"], thursday);
    expect(picks.get("Dia")?.bankSlug).toBe("santander");
  });

  it("ignores a promo that only applies on another weekday", () => {
    const promos = [promo({ daysOfWeek: '["viernes"]' })];
    const picks = pickTodaysPromos(carts, promos, ["santander"], thursday);
    expect(picks.has("Dia")).toBe(false);
  });

  it("ignores an expired promo", () => {
    const promos = [promo({ validUntil: "2026-01-01" })];
    const picks = pickTodaysPromos(carts, promos, ["santander"], thursday);
    expect(picks.has("Dia")).toBe(false);
  });

  it("respects the cap when computing the discounted total", () => {
    const promos = [promo({ discountPercent: 50, capAmount: 1000 })];
    const picks = pickTodaysPromos(carts, promos, ["santander"], thursday);
    expect(picks.get("Dia")?.discountedTotal).toBe(9000);
  });

  it("returns an empty map with no preferred banks", () => {
    const promos = [promo()];
    const picks = pickTodaysPromos(carts, promos, [], thursday);
    expect(picks.size).toBe(0);
  });

  it("keeps the best (lowest discounted total) promo per store", () => {
    const promos = [promo({ discountPercent: 10 }), promo({ bankSlug: "macro", bankDisplayName: "Macro", discountPercent: 30 })];
    const picks = pickTodaysPromos(carts, promos, ["santander", "macro"], thursday);
    expect(picks.get("Dia")?.bankSlug).toBe("macro");
    expect(picks.get("Dia")?.discountedTotal).toBe(7000);
  });
});

describe("pickBestPromoOverall", () => {
  it("returns the pick with the lowest discounted total", () => {
    const picks = new Map([
      ["Dia", { storeName: "Dia", bankSlug: "santander", bankDisplayName: "Santander", discountPercent: 20, capAmount: null, discountedTotal: 8000 }],
      ["Coto", { storeName: "Coto", bankSlug: "macro", bankDisplayName: "Macro", discountPercent: 10, capAmount: null, discountedTotal: 5000 }],
    ]);
    expect(pickBestPromoOverall(picks)?.storeName).toBe("Coto");
  });

  it("returns null for an empty map", () => {
    expect(pickBestPromoOverall(new Map())).toBeNull();
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
