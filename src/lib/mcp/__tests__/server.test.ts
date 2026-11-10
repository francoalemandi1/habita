import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

const { searchAllStoresMock, fetchAllStorePromosMock, productCatalogFindManyMock } = vi.hoisted(() => ({
  searchAllStoresMock: vi.fn(),
  fetchAllStorePromosMock: vi.fn(),
  productCatalogFindManyMock: vi.fn(),
}));

vi.mock("@/lib/vtex-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/vtex-client")>("@/lib/vtex-client");
  return { ...actual, searchAllStores: searchAllStoresMock };
});

vi.mock("@/lib/promos/promoarg-client", () => ({
  fetchAllStorePromos: fetchAllStorePromosMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { productCatalog: { findMany: productCatalogFindManyMock } },
}));

import { createAhorraMcpServer } from "../server";

import type { PromoargPromotion, StorePromosResult } from "@/lib/promos/types";
import type { VtexProduct } from "@/lib/vtex-client";

const TOOL_NAMES = ["compare_cart", "get_bank_promos", "get_product_catalog", "search_product_prices"];
const HOUSEHOLD_TOOL_NAMES = [
  "get_household",
  "list_my_tasks",
  "get_shopping_list",
  "get_expense_balances",
  "list_recent_expenses",
  "add_shopping_list_items",
  "set_shopping_list_item_checked",
];

function buildPromo(overrides: Partial<PromoargPromotion>): PromoargPromotion {
  return {
    id: "promo-1",
    bankId: "galicia",
    storeName: "Carrefour",
    title: "30% con Galicia en Carrefour",
    description: "Descuento",
    discountPercentage: 30,
    capAmount: 5000,
    validDays: ["Jueves"],
    validUntil: "2099-12-31T00:00:00.000Z",
    categories: ["Supermercados"],
    imageUrl: null,
    paymentMethods: [],
    eligiblePlans: [],
    participatingBanks: null,
    detailsUrl: null,
    ...overrides,
  };
}

function buildProduct(overrides: Partial<VtexProduct> = {}): VtexProduct {
  return {
    productName: "Leche entera La Serenisima 1L",
    price: 1000,
    listPrice: null,
    link: "http://example.com/leche",
    imageUrl: null,
    ...overrides,
  };
}

async function connectClient(identity?: Parameters<typeof createAhorraMcpServer>[0]) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createAhorraMcpServer(identity);
  const client = new Client({ name: "test-client", version: "1.0.0" });

  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

  return { client, server };
}

function isTextContent(value: unknown): value is { type: "text"; text: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "text" &&
    "text" in value &&
    typeof value.text === "string"
  );
}

/** Safely extract `{ data, isError }` from a tool call result, without unsafe casts on the SDK's broad union type. */
async function callToolJson<T>(
  client: Client,
  params: { name: string; arguments?: Record<string, unknown> },
): Promise<{ data: T | null; isError: boolean }> {
  const result = await client.callTool(params);
  const isError = "isError" in result && result.isError === true;

  if (!("content" in result) || !Array.isArray(result.content)) return { data: null, isError };

  const first: unknown = result.content[0];
  if (isError || !isTextContent(first)) return { data: null, isError };
  return { data: JSON.parse(first.text) as T, isError };
}

describe("createAhorraMcpServer", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists exactly the 4 tools for a null identity (API key)", async () => {
    const { client } = await connectClient(null);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([...TOOL_NAMES].sort());
  });

  it("lists exactly the 4 tools for an ahorra-only identity", async () => {
    const { client } = await connectClient({ userId: "user-1", scopes: new Set(["ahorra"]) });
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([...TOOL_NAMES].sort());
  });

  it("lists the 4 price tools plus the 7 household tools for an ahorra+habita identity", async () => {
    const { client } = await connectClient({ userId: "user-1", scopes: new Set(["ahorra", "habita"]) });
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([...TOOL_NAMES, ...HOUSEHOLD_TOOL_NAMES].sort());
  });

  describe("search_product_prices", () => {
    it("reports unavailableStores for stores that failed", async () => {
      searchAllStoresMock.mockResolvedValue([
        { storeName: "Carrefour", products: [buildProduct()], failed: false },
        { storeName: "Coto", products: [], failed: true },
      ]);

      const { client } = await connectClient();
      const { data, isError } = await callToolJson<{
        stores: Array<{ storeName: string }>;
        unavailableStores: string[];
      }>(client, { name: "search_product_prices", arguments: { term: "leche entera" } });

      expect(isError).toBeFalsy();
      expect(data?.unavailableStores).toEqual(["Coto"]);
      expect(data?.stores.map((s) => s.storeName)).toContain("Carrefour");
    });
  });

  describe("compare_cart", () => {
    it("rejects more than 40 items", async () => {
      const items = Array.from({ length: 41 }, (_, i) => ({ term: `item ${i}` }));

      const { client } = await connectClient();
      const { isError } = await callToolJson(client, { name: "compare_cart", arguments: { items } });

      expect(isError).toBe(true);
    });

    it("attaches promoOptions filtered by paymentMethods and day, applies the cap, and computes cheapestWithPromos", async () => {
      searchAllStoresMock.mockResolvedValue([
        { storeName: "Carrefour", products: [buildProduct({ price: 1000 })], failed: false },
        { storeName: "Coto", products: [buildProduct({ price: 2000 })], failed: false },
      ]);
      fetchAllStorePromosMock.mockResolvedValue([
        {
          storeName: "Carrefour",
          promos: [
            buildPromo({
              id: "galicia-every-day",
              bankId: "galicia",
              title: "10% con Galicia en Carrefour",
              validDays: [],
              discountPercentage: 10,
              capAmount: 5000,
            }),
          ],
        },
      ] satisfies StorePromosResult[]);

      const { client } = await connectClient();
      const { data } = await callToolJson<{
        storeCarts: Array<{
          storeName: string;
          totalPrice: number;
          bestTotal: number;
          promoOptions: Array<{ bank: string; estimatedSavings: number; totalWithPromo: number }>;
        }>;
        cheapestWithPromos: { storeName: string; bestTotal: number; bank: string | null } | null;
        promosUnavailable: boolean;
      }>(client, {
        name: "compare_cart",
        arguments: { items: [{ term: "leche entera" }], paymentMethods: ["Galicia"], day: "Lunes" },
      });

      const carrefour = data?.storeCarts.find((c) => c.storeName === "Carrefour");
      expect(carrefour?.promoOptions).toEqual([
        expect.objectContaining({ bank: "Galicia", estimatedSavings: 100, totalWithPromo: 900 }),
      ]);
      expect(carrefour?.bestTotal).toBe(900);

      const coto = data?.storeCarts.find((c) => c.storeName === "Coto");
      expect(coto?.promoOptions).toEqual([]);
      expect(coto?.bestTotal).toBe(2000);

      expect(data?.cheapestWithPromos).toEqual({ storeName: "Carrefour", bestTotal: 900, bank: "Galicia" });
      expect(data?.promosUnavailable).toBe(false);
    });

    it("excludes promoOptions that don't match the given paymentMethods", async () => {
      searchAllStoresMock.mockResolvedValue([
        { storeName: "Carrefour", products: [buildProduct({ price: 1000 })], failed: false },
      ]);
      fetchAllStorePromosMock.mockResolvedValue([
        {
          storeName: "Carrefour",
          promos: [
            buildPromo({
              id: "galicia-every-day",
              bankId: "galicia",
              title: "10% con Galicia en Carrefour",
              validDays: [],
              discountPercentage: 10,
            }),
          ],
        },
      ] satisfies StorePromosResult[]);

      const { client } = await connectClient();
      const { data } = await callToolJson<{
        storeCarts: Array<{ promoOptions: unknown[] }>;
      }>(client, {
        name: "compare_cart",
        arguments: { items: [{ term: "leche entera" }], paymentMethods: ["MODO"] },
      });

      expect(data?.storeCarts[0]?.promoOptions).toEqual([]);
    });

    it("returns near-miss suggestions for not-found terms, never products sharing no word", async () => {
      searchAllStoresMock.mockResolvedValue([
        {
          storeName: "Carrefour",
          products: [
            buildProduct({ productName: "Rebozador Preferido 500g", price: 900 }),
            buildProduct({ productName: "Pan lactal blanco Fargo grande familiar 600g paquete doble bolsa", price: 2500 }),
          ],
          failed: false,
        },
      ]);
      fetchAllStorePromosMock.mockResolvedValue([]);

      const { client } = await connectClient();
      const { data } = await callToolJson<{
        notFound: string[];
        suggestions: Array<{ term: string; productName: string }>;
      }>(client, { name: "compare_cart", arguments: { items: [{ term: "pan rallado condimentado" }] } });

      expect(data?.notFound).toEqual(["pan rallado condimentado"]);
      expect(data?.suggestions.map((s) => s.productName)).toEqual([
        "Pan lactal blanco Fargo grande familiar 600g paquete doble bolsa",
      ]);
    });

    it("sets promosUnavailable when the promo catalog fails to load, without failing the tool", async () => {
      searchAllStoresMock.mockResolvedValue([
        { storeName: "Carrefour", products: [buildProduct({ price: 1000 })], failed: false },
      ]);
      fetchAllStorePromosMock.mockRejectedValue(new Error("promoarg.com is down"));

      const { client } = await connectClient();
      const { data, isError } = await callToolJson<{
        storeCarts: Array<{ promoOptions: unknown[] }>;
        promosUnavailable: boolean;
      }>(client, { name: "compare_cart", arguments: { items: [{ term: "leche entera" }] } });

      expect(isError).toBeFalsy();
      expect(data?.promosUnavailable).toBe(true);
      expect(data?.storeCarts[0]?.promoOptions).toEqual([]);
    });
  });

  describe("get_bank_promos", () => {
    function mockPromoCatalog(): void {
      const storeResults: StorePromosResult[] = [
        {
          storeName: "Carrefour",
          promos: [
            buildPromo({
              id: "thursday-galicia",
              bankId: "galicia",
              title: "30% con Galicia en Carrefour",
              validDays: ["Jueves"],
              discountPercentage: 30,
            }),
            buildPromo({
              id: "every-day-mp",
              bankId: "mercadopago",
              title: "10% con Mercado Pago en Carrefour",
              validDays: [],
              discountPercentage: 10,
            }),
            buildPromo({
              id: "monday-nacion",
              bankId: "nacion",
              title: "20% con Nacion en Carrefour",
              validDays: ["Lunes"],
              discountPercentage: 20,
            }),
            buildPromo({
              id: "expired-santander",
              bankId: "santander",
              title: "50% con Santander en Carrefour",
              validDays: [],
              discountPercentage: 50,
              validUntil: "2000-01-01T00:00:00.000Z",
            }),
            buildPromo({
              id: "every-day-nacion",
              bankId: "nacion",
              title: "15% con Nacion todos los dias en Carrefour",
              validDays: [],
              discountPercentage: 15,
            }),
          ],
        },
      ];
      fetchAllStorePromosMock.mockResolvedValue(storeResults);
    }

    it("filters by day, keeping empty-days promos and excluding other-day promos", async () => {
      mockPromoCatalog();
      const { client } = await connectClient();
      const { data } = await callToolJson<{ promos: Array<{ title: string | null }> }>(client, {
        name: "get_bank_promos",
        arguments: { day: "Jueves" },
      });

      const titles = data?.promos.map((p) => p.title) ?? [];
      expect(titles).toContain("30% con Galicia en Carrefour");
      expect(titles).toContain("10% con Mercado Pago en Carrefour");
      expect(titles).not.toContain("20% con Nacion en Carrefour");
    });

    it("excludes expired promos", async () => {
      mockPromoCatalog();
      const { client } = await connectClient();
      const { data } = await callToolJson<{ promos: Array<{ title: string | null }> }>(client, {
        name: "get_bank_promos",
        arguments: { day: "Jueves" },
      });

      expect(data?.promos.map((p) => p.title)).not.toContain("50% con Santander en Carrefour");
    });

    it("matches bank names case/accent-insensitively", async () => {
      mockPromoCatalog();
      const { client } = await connectClient();
      const { data } = await callToolJson<{ promos: Array<{ title: string | null }> }>(client, {
        name: "get_bank_promos",
        arguments: { day: "Jueves", bank: "nacion" },
      });

      expect(data?.promos.map((p) => p.title)).toEqual(["15% con Nacion todos los dias en Carrefour"]);
    });
  });

  describe("get_product_catalog", () => {
    it("maps rows and falls back to name when searchTerms is empty", async () => {
      productCatalogFindManyMock.mockResolvedValue([
        { name: "Leche entera", category: "LACTEOS", isEssential: true, searchTerms: "leche entera sachet" },
        { name: "Papel higienico", category: "PERFUMERIA", isEssential: false, searchTerms: "" },
      ]);

      const { client } = await connectClient();
      const { data, isError } = await callToolJson<{
        products: Array<{ name: string; term: string; category: string; isEssential: boolean }>;
      }>(client, { name: "get_product_catalog", arguments: {} });

      expect(isError).toBeFalsy();
      expect(data?.products).toEqual([
        { name: "Leche entera", category: "LACTEOS", isEssential: true, term: "leche entera sachet" },
        { name: "Papel higienico", category: "PERFUMERIA", isEssential: false, term: "Papel higienico" },
      ]);
    });
  });

  describe("prompts", () => {
    it("lists monthly_shopping", async () => {
      const { client } = await connectClient();
      const { prompts } = await client.listPrompts();
      expect(prompts.map((p) => p.name)).toContain("monthly_shopping");
    });

    it("renders the prompt with the given args", async () => {
      const { client } = await connectClient();
      const result = await client.getPrompt({
        name: "monthly_shopping",
        arguments: { household: "two adults in their 20s", budget: "150000" },
      });

      expect(result.messages).toHaveLength(1);
      const [message] = result.messages;
      if (message?.content.type !== "text") throw new Error("Expected text content");
      expect(message.content.text).toContain("two adults in their 20s");
      expect(message.content.text).toContain("150000");
      expect(message.content.text).toContain("get_product_catalog");
      expect(message.content.text).toContain("compare_cart");
    });
  });
});
