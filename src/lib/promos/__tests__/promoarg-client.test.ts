import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAllStorePromos } from "../promoarg-client";

import type { PromoargPromotion } from "../types";

function buildPromotion(id: string): PromoargPromotion {
  return {
    id,
    bankId: "galicia",
    storeName: "Carrefour",
    title: id,
    description: "",
    discountPercentage: 10,
    capAmount: null,
    validDays: [],
    validUntil: null,
    categories: [],
    imageUrl: null,
    paymentMethods: [],
    eligiblePlans: [],
    participatingBanks: null,
    detailsUrl: null,
  };
}

function pageResponse(page: number, totalPages: number): Response {
  return Response.json({ promotions: [buildPromotion(`p${page}`)], total: totalPages, page, limit: 1, totalPages });
}

function pageNumberOf(input: unknown): number {
  return Number(new URL(String(input)).searchParams.get("page"));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchAllStorePromos", () => {
  it("fetches every page and keeps page order", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: unknown) => pageResponse(pageNumberOf(input), 4)));

    const [result] = await fetchAllStorePromos(["Carrefour"]);

    expect(result?.promos.map((promo) => promo.id)).toEqual(["p1", "p2", "p3", "p4"]);
  });

  it("skips a failed later page instead of dropping the store", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const page = pageNumberOf(input);
        return page === 3 ? new Response("boom", { status: 500 }) : pageResponse(page, 4);
      }),
    );

    const [result] = await fetchAllStorePromos(["Carrefour"]);

    expect(result?.promos.map((promo) => promo.id)).toEqual(["p1", "p2", "p4"]);
  });

  it("returns no promos for a store whose first page fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 503 })));

    await expect(fetchAllStorePromos(["Carrefour"])).resolves.toEqual([{ storeName: "Carrefour", promos: [] }]);
  });
});
