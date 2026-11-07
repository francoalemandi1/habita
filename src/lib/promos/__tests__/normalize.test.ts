import { describe, expect, it } from "vitest";

import { normalizeStorePromos } from "../normalize";

import type { PromoargPromotion, StorePromosResult } from "../types";

function buildPromo(overrides: Partial<PromoargPromotion>): PromoargPromotion {
  return {
    id: "promo-1",
    bankId: "galicia",
    storeName: "Carrefour",
    title: "30% con Galicia en Carrefour",
    description: "Descuento todos los jueves",
    discountPercentage: 30,
    capAmount: 5000,
    validDays: ["Jueves"],
    validUntil: "2026-12-31T00:00:00.000Z",
    categories: ["Supermercados"],
    imageUrl: null,
    paymentMethods: ["Tarjeta de crédito"],
    eligiblePlans: ["Clasica"],
    participatingBanks: null,
    detailsUrl: "https://example.com/promo-1",
    ...overrides,
  };
}

describe("normalizeStorePromos", () => {
  it("filters out promos with no discount", () => {
    const storeResults: StorePromosResult[] = [
      {
        storeName: "Carrefour",
        promos: [buildPromo({ id: "zero", discountPercentage: 0 }), buildPromo({ id: "null", discountPercentage: null })],
      },
    ];

    expect(normalizeStorePromos(storeResults)).toEqual([]);
  });

  it("drops promos whose title doesn't reference the store", () => {
    const storeResults: StorePromosResult[] = [
      {
        storeName: "Carrefour",
        promos: [buildPromo({ title: "30% con Galicia en Coto" })],
      },
    ];

    expect(normalizeStorePromos(storeResults)).toEqual([]);
  });

  it("merges variants differing only in eligiblePlans and sorted days, normalizes accents", () => {
    const storeResults: StorePromosResult[] = [
      {
        storeName: "Carrefour",
        promos: [
          buildPromo({ id: "a", validDays: ["Sabado", "Miercoles"], eligiblePlans: ["Clasica"] }),
          buildPromo({ id: "b", validDays: ["Miercoles", "Sabado"], eligiblePlans: ["Plus"] }),
        ],
      },
    ];

    const result = normalizeStorePromos(storeResults);

    expect(result).toEqual([
      {
        storeName: "Carrefour",
        promoargId: "a",
        bankSlug: "galicia",
        bankDisplayName: "Galicia",
        title: "30% con Galicia en Carrefour",
        description: "Descuento todos los jueves",
        discountPercent: 30,
        daysOfWeek: ["Sábado", "Miércoles"],
        paymentMethods: ["Tarjeta de crédito"],
        eligiblePlans: ["Clasica", "Plus"],
        capAmount: 5000,
        categories: ["Supermercados"],
        validUntil: new Date("2026-12-31T00:00:00.000Z"),
        sourceUrl: "https://example.com/promo-1",
      },
    ]);
  });

  it("resolves a payment network bankId to the real bank and injects the network label", () => {
    const storeResults: StorePromosResult[] = [
      {
        storeName: "Coto",
        promos: [
          buildPromo({
            id: "modo-ciudad",
            bankId: "modo",
            title: "20% con MODO en Coto",
            participatingBanks: ["Banco Ciudad"],
            paymentMethods: ["Transferencia"],
          }),
        ],
      },
    ];

    expect(normalizeStorePromos(storeResults)).toEqual([
      {
        storeName: "Coto",
        promoargId: "modo-ciudad",
        bankSlug: "ciudad",
        bankDisplayName: "Ciudad",
        title: "20% con MODO en Coto",
        description: "Descuento todos los jueves",
        discountPercent: 30,
        daysOfWeek: ["Jueves"],
        paymentMethods: ["MODO", "Transferencia"],
        eligiblePlans: ["Clasica"],
        capAmount: 5000,
        categories: ["Supermercados"],
        validUntil: new Date("2026-12-31T00:00:00.000Z"),
        sourceUrl: "https://example.com/promo-1",
      },
    ]);
  });
});
