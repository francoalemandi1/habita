import { afterEach, describe, expect, it, vi } from "vitest";

import type { Limiter } from "@/lib/concurrency";
import type { StoreSearchResult, VtexProduct } from "@/lib/vtex-client";

const { searchAllStoresMock } = vi.hoisted(() => ({
  searchAllStoresMock: vi.fn(),
}));

vi.mock("@/lib/vtex-client", () => ({
  searchAllStores: searchAllStoresMock,
}));

import { compareProducts } from "@/lib/supermarket-search";

function makeProduct(name: string, price: number): VtexProduct {
  return { productName: name, price, listPrice: null, link: "https://example.com", imageUrl: null };
}

describe("compareProducts", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("never exceeds 8 concurrent store requests for 30 terms x 11 stores", async () => {
    const storeNames = Array.from({ length: 11 }, (_, i) => `Store${i}`);
    let active = 0;
    let maxActive = 0;

    searchAllStoresMock.mockImplementation(
      async (term: string, _city: string | null, limiter: Limiter): Promise<StoreSearchResult[]> => {
        return Promise.all(
          storeNames.map((storeName) =>
            limiter.run(async () => {
              active++;
              maxActive = Math.max(maxActive, active);
              await new Promise((resolve) => setTimeout(resolve, 0));
              active--;
              return {
                storeName,
                products: [makeProduct(`${term} marca`, 10)],
                failed: false,
              } satisfies StoreSearchResult;
            }),
          ),
        );
      },
    );

    const terms = Array.from({ length: 30 }, (_, i) => `producto ${i}`);
    await compareProducts(terms, null, null);

    expect(maxActive).toBeLessThanOrEqual(8);
  });

  it("marks a store unavailable only when it fails every term, excludes it from storeCarts, and does not create a false notFound", async () => {
    searchAllStoresMock.mockImplementation(
      async (term: string): Promise<StoreSearchResult[]> => [
        { storeName: "DownStore", products: [], failed: true },
        { storeName: "UpStore", products: [makeProduct(`${term} marca`, 20)], failed: false },
      ],
    );

    const result = await compareProducts(["leche", "pan"], null, null);

    expect(result.unavailableStores).toEqual(["DownStore"]);
    expect(result.storeCarts.map((c) => c.storeName)).toEqual(["UpStore"]);
    expect(result.notFound).toEqual([]);
    const upCart = result.storeCarts.find((c) => c.storeName === "UpStore");
    expect(upCart?.missingTerms).toEqual([]);
  });

  it("does not mark a store unavailable when it only fails some terms (partial failure)", async () => {
    searchAllStoresMock.mockImplementation(
      async (term: string): Promise<StoreSearchResult[]> => [
        {
          storeName: "FlakyStore",
          products: term === "pan" ? [] : [makeProduct(`${term} marca`, 15)],
          failed: term === "pan",
        },
      ],
    );

    const result = await compareProducts(["leche", "pan"], null, null);

    expect(result.unavailableStores).toEqual([]);
    const cart = result.storeCarts.find((c) => c.storeName === "FlakyStore");
    expect(cart?.products.map((p) => p.searchTerm)).toEqual(["leche"]);
  });
});
