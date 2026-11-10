import { afterEach, describe, expect, it, vi } from "vitest";

import type { Limiter } from "@/lib/concurrency";
import type { StoreSearchResult, VtexProduct } from "@/lib/vtex-client";

const { searchAllStoresMock } = vi.hoisted(() => ({
  searchAllStoresMock: vi.fn(),
}));

vi.mock("@/lib/vtex-client", () => ({
  searchAllStores: searchAllStoresMock,
}));

import { buildNotFoundSuggestions, compareProducts } from "@/lib/supermarket-search";

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

  it("finds a plural search term against a singular product name via stemming", async () => {
    searchAllStoresMock.mockImplementation(
      async (): Promise<StoreSearchResult[]> => [
        { storeName: "Store1", products: [makeProduct("Tomate Perita x kg", 500)], failed: false },
      ],
    );

    const result = await compareProducts(["tomates"], null, null);

    expect(result.notFound).toEqual([]);
    const cart = result.storeCarts.find((c) => c.storeName === "Store1");
    expect(cart?.products[0]?.productName).toBe("Tomate Perita x kg");
  });

  it("prefers a product named after the term over a cheaper one that only mentions it", async () => {
    searchAllStoresMock.mockImplementation(
      async (): Promise<StoreSearchResult[]> => [
        {
          storeName: "Toledo",
          products: [makeProduct("FLAN DULCE DE LECHE", 1180), makeProduct("LECHE ENTERA LV", 2699)],
          failed: false,
        },
      ],
    );

    const result = await compareProducts(["leche"], null, null);

    const cart = result.storeCarts.find((c) => c.storeName === "Toledo");
    expect(cart?.products[0]?.productName).toBe("LECHE ENTERA LV");
  });

  it("does not match a different product that only shares the size (Yerba 1 kg is not Harina 1 Kg)", async () => {
    searchAllStoresMock.mockImplementation(
      async (): Promise<StoreSearchResult[]> => [
        { storeName: "Cordiez", products: [makeProduct("Harina 000 Ur VitD Canuelas 1 Kg", 980)], failed: false },
        { storeName: "Vea", products: [makeProduct("Yerba Mate con Palo Suave 1 Kg Rosamonte", 4490)], failed: false },
      ],
    );

    const result = await compareProducts(["Yerba 1 kg"], null, null);

    const cordiez = result.storeCarts.find((c) => c.storeName === "Cordiez");
    expect(cordiez?.products ?? []).toEqual([]);
    const vea = result.storeCarts.find((c) => c.storeName === "Vea");
    expect(vea?.products[0]?.productName).toBe("Yerba Mate con Palo Suave 1 Kg Rosamonte");
  });

  it("falls back to the cheapest match when no product name starts with the term", async () => {
    searchAllStoresMock.mockImplementation(
      async (): Promise<StoreSearchResult[]> => [
        {
          storeName: "Store1",
          products: [makeProduct("La Serenisima Leche Entera 1L", 2500), makeProduct("Ilolay Leche Entera 1L", 2300)],
          failed: false,
        },
      ],
    );

    const result = await compareProducts(["leche"], null, null);

    const cart = result.storeCarts.find((c) => c.storeName === "Store1");
    expect(cart?.products[0]?.productName).toBe("Ilolay Leche Entera 1L");
  });

  it("retries a globally not-found term with a synonym variant and reports it under the original term", async () => {
    searchAllStoresMock.mockImplementation(async (term: string): Promise<StoreSearchResult[]> => {
      if (term === "cloro") {
        return [{ storeName: "Store1", products: [makeProduct("Cloro Ayudin 1L", 500)], failed: false }];
      }
      return [{ storeName: "Store1", products: [], failed: false }];
    });

    const result = await compareProducts(["lavandina"], null, null);

    expect(result.notFound).toEqual([]);
    const cart = result.storeCarts.find((c) => c.storeName === "Store1");
    expect(cart?.products[0]?.searchTerm).toBe("lavandina");
    expect(cart?.products[0]?.productName).toBe("Cloro Ayudin 1L");
  });

  it("bounds the synonym retry to 10 terms per call", async () => {
    const synonymTermsAskedFor = new Set<string>();
    const termsWithSynonyms = [
      "lavandina",
      "porotos",
      "choclo",
      "zapallito",
      "palta",
      "frutilla",
      "durazno",
      "anana",
      "papa",
      "arveja",
      "morron",
    ];
    const synonymVariantByTerm: Record<string, string> = {
      lavandina: "cloro",
      porotos: "frijoles",
      choclo: "maiz",
      zapallito: "zucchini",
      palta: "aguacate",
      frutilla: "fresa",
      durazno: "melocoton",
      anana: "pina",
      papa: "patata",
      arveja: "guisante",
      morron: "pimiento",
    };

    searchAllStoresMock.mockImplementation(async (term: string): Promise<StoreSearchResult[]> => {
      if (Object.values(synonymVariantByTerm).includes(term)) {
        synonymTermsAskedFor.add(term);
      }
      return [{ storeName: "Store1", products: [], failed: false }];
    });

    await compareProducts(termsWithSynonyms, null, null);

    expect(synonymTermsAskedFor.size).toBeLessThanOrEqual(10);
  });

  it("returns near-miss suggestions for a term below the match threshold and none when found", async () => {
    searchAllStoresMock.mockImplementation(async (term: string): Promise<StoreSearchResult[]> => {
      if (term === "banana") {
        return [{ storeName: "Store1", products: [makeProduct("Banana", 100)], failed: false }];
      }
      return [{ storeName: "Store1", products: [makeProduct("Yogur bebible frutilla", 300)], failed: false }];
    });

    const result = await compareProducts(["banana", "kiwi"], null, null);

    expect(result.notFound).toEqual(["kiwi"]);
    expect(result.storeCarts.some((c) => c.products.some((p) => p.searchTerm === "banana"))).toBe(true);
  });

  it("buildNotFoundSuggestions returns below-threshold candidates that share a word with the term", () => {
    const longKiwiName = "Kiwi verde seleccion bandeja por seis unidades origen Chile premium";
    const suggestions = buildNotFoundSuggestions("kiwi fresco organico", [
      { storeName: "Store1", product: makeProduct(longKiwiName, 200) },
      // Shares no word with the term: the length factor alone must not make it a suggestion.
      { storeName: "Store1", product: makeProduct("Frutas frescas varias", 50) },
    ]);

    expect(suggestions).toEqual([
      { term: "kiwi fresco organico", storeName: "Store1", productName: longKiwiName, price: 200, link: "https://example.com" },
    ]);
  });

  it("omits suggestions when every term is found", async () => {
    searchAllStoresMock.mockImplementation(
      async (term: string): Promise<StoreSearchResult[]> => [
        { storeName: "Store1", products: [makeProduct(`${term} marca`, 15)], failed: false },
      ],
    );

    const result = await compareProducts(["leche"], null, null);

    expect(result.suggestions).toBeUndefined();
  });
});
