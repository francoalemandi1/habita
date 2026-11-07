import { describe, expect, it } from "vitest";
import {
  bestPromoPerBank,
  discountedPrice,
  formatDaysShort,
  isPromoExpired,
  parseDaysOfWeek,
  promoAppliesOnDay,
  scorePromo,
} from "@habita/prices";

import type { PromoLike } from "@habita/prices";

function buildPromo(overrides: Partial<PromoLike> & { bankSlug: string }): PromoLike {
  return {
    discountPercent: 20,
    capAmount: null,
    daysOfWeek: "[]",
    validUntil: null,
    ...overrides,
  };
}

describe("isPromoExpired", () => {
  it("is false without validUntil, true when it is clearly in the past", () => {
    expect(isPromoExpired(buildPromo({ bankSlug: "galicia", validUntil: null }), new Date())).toBe(false);
    expect(isPromoExpired(buildPromo({ bankSlug: "galicia", validUntil: "2000-01-01" }), new Date())).toBe(true);
  });

  it("never expires with a null validUntil", () => {
    expect(isPromoExpired(buildPromo({ bankSlug: "galicia", validUntil: null }), new Date("2026-10-29"))).toBe(false);
  });

  it("treats an unparseable date as not expired", () => {
    expect(isPromoExpired(buildPromo({ bankSlug: "galicia", validUntil: "not-a-date" }), new Date())).toBe(false);
  });

  it.each([
    ["date-only string", "2026-10-28"],
    ["Date object", new Date("2026-10-28")],
    ["ISO string", "2026-10-28T00:00:00.000Z"],
  ])("with a %s validUntil, is valid through the end of the Argentina day", (_label, validUntil) => {
    const promo = buildPromo({ bankSlug: "galicia", validUntil });
    // 23:30 ART on the 28th (ART = UTC-3)
    expect(isPromoExpired(promo, new Date("2026-10-29T02:30:00.000Z"))).toBe(false);
    // 00:30 ART on the 29th
    expect(isPromoExpired(promo, new Date("2026-10-29T03:30:00.000Z"))).toBe(true);
  });
});

describe("promoAppliesOnDay", () => {
  it("applies to every day when daysOfWeek is empty", () => {
    expect(promoAppliesOnDay(buildPromo({ bankSlug: "galicia", daysOfWeek: "[]" }), "lunes")).toBe(true);
  });

  it("is accent- and case-tolerant", () => {
    expect(promoAppliesOnDay(buildPromo({ bankSlug: "galicia", daysOfWeek: '["Miercoles"]' }), "miércoles")).toBe(true);
    expect(promoAppliesOnDay(buildPromo({ bankSlug: "galicia", daysOfWeek: '["Lunes"]' }), "lunes")).toBe(true);
    expect(promoAppliesOnDay(buildPromo({ bankSlug: "galicia", daysOfWeek: '["lunes"]' }), "martes")).toBe(false);
  });

  it("accepts daysOfWeek as an already-parsed array (MCP cache shape)", () => {
    expect(promoAppliesOnDay(buildPromo({ bankSlug: "galicia", daysOfWeek: ["Lunes"] }), "lunes")).toBe(true);
    expect(promoAppliesOnDay(buildPromo({ bankSlug: "galicia", daysOfWeek: [] }), "martes")).toBe(true);
  });
});

describe("parseDaysOfWeek", () => {
  it("returns [] for invalid JSON or a non-array", () => {
    expect(parseDaysOfWeek("not json")).toEqual([]);
    expect(parseDaysOfWeek('{"a":1}')).toEqual([]);
  });

  it("filters out non-string elements", () => {
    expect(parseDaysOfWeek('["lunes", 1, null, "martes"]')).toEqual(["lunes", "martes"]);
  });
});

describe("scorePromo", () => {
  it("scores 0 when expired regardless of discount", () => {
    const promo = buildPromo({ bankSlug: "galicia", validUntil: "2000-01-01", discountPercent: 50 });
    expect(scorePromo(promo, "lunes", new Date())).toBe(0);
  });

  it("adds bonuses for no cap and applying today", () => {
    const promo = buildPromo({ bankSlug: "galicia", discountPercent: 20, capAmount: null, daysOfWeek: "[]" });
    expect(scorePromo(promo, "lunes", new Date())).toBe(35);
  });
});

describe("bestPromoPerBank", () => {
  it("keeps the highest-scoring promo per bank, sorted, and drops expired ones", () => {
    const now = new Date("2026-01-01");
    const promos = [
      buildPromo({ bankSlug: "galicia", discountPercent: 10 }),
      buildPromo({ bankSlug: "galicia", discountPercent: 30 }),
      buildPromo({ bankSlug: "santander", discountPercent: 20 }),
      buildPromo({ bankSlug: "bbva", discountPercent: 90, validUntil: "2000-01-01" }),
    ];
    const best = bestPromoPerBank(promos, "lunes", now);
    expect(best.map((p) => p.discountPercent)).toEqual([30, 20]);
  });
});

describe("discountedPrice", () => {
  it("applies the discount, capped when a cap is set", () => {
    expect(discountedPrice(1000, 20, null)).toBe(800);
    expect(discountedPrice(1000, 50, 100)).toBe(900);
  });
});

describe("formatDaysShort", () => {
  it("returns the all-days label for an empty or 7-day list", () => {
    expect(formatDaysShort([], { allDaysLabel: "Todos" })).toBe("Todos");
    expect(
      formatDaysShort(
        ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
        { allDaysLabel: "Todos los días" },
      ),
    ).toBe("Todos los días");
  });

  it("formats a partial list with accent-insensitive short labels", () => {
    expect(formatDaysShort(["Lunes", "Miercoles"], { allDaysLabel: "Todos" })).toBe("Lun, Mié");
  });
});
