import { describe, expect, it } from "vitest";
import { applyOverrides, buildSavingsSummary, isTermMissing, overrideKey } from "./super-compare-logic";

import type { AlternativeProduct, StoreCart } from "@habita/contracts";

function buildCart(overrides: Partial<StoreCart>): StoreCart {
  return {
    storeName: "Coto",
    products: [
      {
        searchTerm: "leche",
        quantity: 1,
        productName: "Leche entera",
        price: 1000,
        lineTotal: 1000,
        listPrice: null,
        imageUrl: null,
        link: "https://example.com/leche",
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
  it("recomputes quantity and lineTotal from searchItems", () => {
    const [adjusted] = applyOverrides([buildCart({})], new Map(), [{ term: "leche", quantity: 3 }]);
    expect(adjusted!.products[0]!.quantity).toBe(3);
    expect(adjusted!.products[0]!.lineTotal).toBe(3000);
    expect(adjusted!.totalPrice).toBe(3000);
  });

  it("swaps a product and keeps the original as the first alternative", () => {
    const alternative: AlternativeProduct = {
      productName: "Leche descremada",
      price: 900,
      listPrice: null,
      link: "https://example.com/alt",
      imageUrl: null,
      unitInfo: null,
    };
    const overrides = new Map([[overrideKey("Coto", "leche"), { type: "swap" as const, alternative }]]);
    const [adjusted] = applyOverrides([buildCart({})], overrides, [{ term: "leche", quantity: 1 }]);
    expect(adjusted!.products[0]!.productName).toBe("Leche descremada");
    expect(adjusted!.products[0]!.lineTotal).toBe(900);
    expect(adjusted!.products[0]!.alternatives[0]!.productName).toBe("Leche entera");
    expect(adjusted!.totalPrice).toBe(900);
  });
});

describe("buildSavingsSummary", () => {
  it("returns null when there is fewer than 2 carts", () => {
    expect(buildSavingsSummary([])).toEqual({ savingsVsNext: null, nextStoreName: null });
  });

  it("computes the winner's savings vs. the runner-up", () => {
    const winner = buildCart({ storeName: "Coto", totalPrice: 1000 });
    const runnerUp = buildCart({ storeName: "Dia", totalPrice: 1500 });
    expect(buildSavingsSummary([winner, runnerUp])).toEqual({ savingsVsNext: 500, nextStoreName: "Dia" });
  });
});

describe("isTermMissing", () => {
  it("matches accent- and case-insensitively", () => {
    const cart = buildCart({ missingTerms: ["Café"] });
    expect(isTermMissing(cart, "cafe")).toBe(true);
    expect(isTermMissing(cart, "pan")).toBe(false);
  });
});
