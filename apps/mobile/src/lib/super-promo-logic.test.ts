import { describe, expect, it } from "vitest";
import {
  calcDiscountedPrice,
  getBestPromosByBank,
  isPromoExpired,
  promoAppliesToday,
  scorePromo,
} from "./super-promo-logic";

import type { BankPromo } from "@habita/contracts";

function buildPromo(overrides: Partial<BankPromo>): BankPromo {
  return {
    id: "promo-1",
    householdId: "household-1",
    bankSlug: "galicia",
    bankDisplayName: "Galicia",
    storeName: "Coto",
    title: null,
    description: null,
    discountPercent: 20,
    capAmount: null,
    daysOfWeek: "[]",
    paymentMethods: null,
    eligiblePlans: null,
    validUntil: null,
    sourceUrl: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("isPromoExpired", () => {
  it("is false without validUntil, true when it is in the past", () => {
    expect(isPromoExpired(buildPromo({ validUntil: null }))).toBe(false);
    expect(isPromoExpired(buildPromo({ validUntil: "2000-01-01" }))).toBe(true);
  });
});

describe("promoAppliesToday", () => {
  it("applies to every day when daysOfWeek is empty", () => {
    expect(promoAppliesToday(buildPromo({ daysOfWeek: "[]" }), "lunes")).toBe(true);
  });

  it("is accent- and case-tolerant", () => {
    expect(promoAppliesToday(buildPromo({ daysOfWeek: '["Miercoles"]' }), "miércoles")).toBe(true);
    expect(promoAppliesToday(buildPromo({ daysOfWeek: '["lunes"]' }), "martes")).toBe(false);
  });
});

describe("scorePromo", () => {
  it("scores 0 when expired regardless of discount", () => {
    expect(scorePromo(buildPromo({ validUntil: "2000-01-01", discountPercent: 50 }), "lunes")).toBe(0);
  });

  it("adds bonuses for no cap and applying today", () => {
    const promo = buildPromo({ discountPercent: 20, capAmount: null, daysOfWeek: "[]" });
    expect(scorePromo(promo, "lunes")).toBe(35);
  });
});

describe("getBestPromosByBank", () => {
  it("keeps the highest-scoring promo per bank and drops expired ones", () => {
    const promos = [
      buildPromo({ id: "a", bankSlug: "galicia", discountPercent: 10 }),
      buildPromo({ id: "b", bankSlug: "galicia", discountPercent: 30 }),
      buildPromo({ id: "c", bankSlug: "santander", discountPercent: 20 }),
      buildPromo({ id: "d", bankSlug: "bbva", discountPercent: 90, validUntil: "2000-01-01" }),
    ];
    const best = getBestPromosByBank(promos, "lunes");
    expect(best.map((p) => p.id)).toEqual(["b", "c"]);
  });
});

describe("calcDiscountedPrice", () => {
  it("applies the discount, capped when a cap is set", () => {
    expect(calcDiscountedPrice(1000, 20, null)).toBe(800);
    expect(calcDiscountedPrice(1000, 50, 100)).toBe(900);
  });
});
