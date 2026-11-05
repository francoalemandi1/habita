import { describe, expect, it } from "vitest";
import { countCartProducts, formatRelativeAge, pickLatestCart } from "./casa-cart";

import type { SavedCart } from "@habita/contracts";

function buildCart(overrides: Partial<SavedCart>): SavedCart {
  return {
    id: "c1",
    storeName: "Coto",
    searchTerms: ["leche"],
    products: [{ name: "Leche" }],
    totalPrice: 1000,
    cheapestCount: 1,
    missingTerms: [],
    totalSearched: 1,
    savedAt: new Date().toISOString(),
    refreshedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("countCartProducts", () => {
  it("counts array products", () => {
    expect(countCartProducts(buildCart({ products: [{}, {}, {}] }))).toBe(3);
  });

  it("returns 0 when products is not an array", () => {
    expect(countCartProducts(buildCart({ products: null as unknown as SavedCart["products"] }))).toBe(0);
  });
});

describe("formatRelativeAge", () => {
  it("formats minutes, hours and days", () => {
    const now = new Date(2026, 10, 3, 12, 0, 0);
    expect(formatRelativeAge(new Date(2026, 10, 3, 11, 50, 0).toISOString(), now)).toBe("hace 10 minutos");
    expect(formatRelativeAge(new Date(2026, 10, 3, 9, 0, 0).toISOString(), now)).toBe("hace 3 horas");
    expect(formatRelativeAge(new Date(2026, 10, 1, 12, 0, 0).toISOString(), now)).toBe("hace 2 días");
  });

  it("falls back to 'hace un momento' for very recent or invalid dates", () => {
    const now = new Date(2026, 10, 3, 12, 0, 0);
    expect(formatRelativeAge(now.toISOString(), now)).toBe("hace un momento");
  });
});

describe("pickLatestCart", () => {
  it("returns null for an empty list", () => {
    expect(pickLatestCart([])).toBeNull();
  });

  it("picks the most recently saved cart", () => {
    const older = buildCart({ id: "older", savedAt: new Date(2026, 10, 1).toISOString() });
    const newer = buildCart({ id: "newer", savedAt: new Date(2026, 10, 3).toISOString() });
    expect(pickLatestCart([older, newer])?.id).toBe("newer");
  });
});
