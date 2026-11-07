/**
 * MCP tool: search_product_prices.
 *
 * Searches Argentine supermarkets for a product term and returns the best
 * ranked matches per store, in ARS. Caches the raw per-store search for 4h —
 * never caches when every store failed (so the next call retries fresh).
 */

import { z } from "zod";

import { searchAllStores } from "@/lib/vtex-client";
import { pickRankedMatches } from "@/lib/supermarket-search";
import { createLimiter } from "@/lib/concurrency";
import { cacheGet, cacheSet, searchCacheKey, SEARCH_CACHE_TTL_SECONDS } from "../cache";

import type { StoreSearchResult } from "@/lib/vtex-client";
import type { ProductUnitInfo } from "@/lib/supermarket-search";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const STORE_SEARCH_CONCURRENCY = 8;
const DEFAULT_LIMIT = 3;

export const searchProductPricesInputSchema = {
  term: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .describe("Product search term in Spanish (e.g. 'leche entera', 'papel higienico'). Argentine product names work best."),
  city: z
    .string()
    .trim()
    .max(60)
    .optional()
    .describe("Argentine city to restrict results to stores with coverage there. Omit to search all stores."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(5)
    .default(DEFAULT_LIMIT)
    .describe("Max number of ranked matches to return per store (1-5)."),
};

interface RankedMatchOutput {
  productName: string;
  price: number;
  listPrice: number | null;
  pricePerUnit?: number;
  unit?: string;
  link: string;
}

interface StoreMatches {
  storeName: string;
  matches: RankedMatchOutput[];
}

export interface SearchProductPricesResult {
  stores: StoreMatches[];
  unavailableStores: string[];
}

interface UnifiedCandidate {
  productName: string;
  price: number;
  listPrice: number | null;
  link: string;
  unitInfo: ProductUnitInfo | null;
}

function toOutput(candidate: UnifiedCandidate): RankedMatchOutput {
  return {
    productName: candidate.productName,
    price: candidate.price,
    listPrice: candidate.listPrice,
    ...(candidate.unitInfo
      ? { pricePerUnit: candidate.unitInfo.pricePerUnit, unit: candidate.unitInfo.unitLabel }
      : {}),
    link: candidate.link,
  };
}

function buildMatches(storeResult: StoreSearchResult, term: string, limit: number): RankedMatchOutput[] {
  const ranked = pickRankedMatches(term, storeResult.products);
  if (!ranked) return [];

  const candidates: UnifiedCandidate[] = [
    {
      productName: ranked.product.productName,
      price: ranked.product.price,
      listPrice: ranked.product.listPrice,
      link: ranked.product.link,
      unitInfo: ranked.unitInfo,
    },
    ...ranked.alternatives.map((alt) => ({
      productName: alt.productName,
      price: alt.price,
      listPrice: alt.listPrice,
      link: alt.link,
      unitInfo: alt.unitInfo,
    })),
  ];

  return candidates.slice(0, limit).map(toOutput);
}

export async function runSearchProductPrices(input: {
  term: string;
  city?: string;
  limit?: number;
}): Promise<SearchProductPricesResult> {
  const limit = input.limit ?? DEFAULT_LIMIT;
  const cacheKey = searchCacheKey(input.term, input.city);

  const cached = await cacheGet<StoreSearchResult[]>(cacheKey);
  const storeResults = cached ?? (await fetchFresh(input.term, input.city));

  if (!cached) {
    const everyStoreFailed = storeResults.every((r) => r.failed);
    if (!everyStoreFailed) {
      await cacheSet(cacheKey, storeResults, SEARCH_CACHE_TTL_SECONDS);
    }
  }

  const stores: StoreMatches[] = [];
  const unavailableStores: string[] = [];

  for (const storeResult of storeResults) {
    if (storeResult.failed) {
      unavailableStores.push(storeResult.storeName);
      continue;
    }
    const matches = buildMatches(storeResult, input.term, limit);
    if (matches.length > 0) {
      stores.push({ storeName: storeResult.storeName, matches });
    }
  }

  return { stores, unavailableStores };
}

async function fetchFresh(term: string, city: string | undefined): Promise<StoreSearchResult[]> {
  const limiter = createLimiter(STORE_SEARCH_CONCURRENCY);
  return searchAllStores(term, city ?? null, limiter);
}

export async function handleSearchProductPrices(args: {
  term: string;
  city?: string;
  limit?: number;
}): Promise<CallToolResult> {
  try {
    const result = await runSearchProductPrices(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    console.error("[mcp/search_product_prices] Tool failed:", error);
    return {
      content: [{ type: "text", text: "Failed to search product prices. Please try again." }],
      isError: true,
    };
  }
}
