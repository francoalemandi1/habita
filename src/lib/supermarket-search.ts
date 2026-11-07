/**
 * Orchestrates supermarket price comparison across multiple stores.
 *
 * Takes a list of search terms, queries all stores in parallel, picks the best
 * match per term per store (by price/unit), and builds cart-per-store results
 * with alternatives.
 */

import { searchAllStores } from "@/lib/vtex-client";
import { createLimiter } from "@/lib/concurrency";
import {
  expandTermVariants,
  normalizeSearchItems,
  pickRankedMatches,
  buildStoreCarts,
  buildNotFoundSuggestions,
  buildSuggestionsForNotFound,
  findGloballyNotFoundTerms,
} from "@habita/prices";

import type { StoreSearchResult } from "@/lib/vtex-client";
import type { Limiter } from "@/lib/concurrency";
import type { SearchItem, ShoppingPlanResult, TermResult } from "@habita/prices";

export type {
  ProductUnitInfo,
  AlternativeProduct,
  CartProduct,
  StoreCart,
  NotFoundSuggestion,
  ShoppingPlanResult,
  SearchItem,
  TermResult,
} from "@habita/prices";

export { pickRankedMatches, buildNotFoundSuggestions };

// ============================================
// Synonym retry
// ============================================

const MAX_SYNONYM_RETRY_TERMS = 10;

/**
 * For terms that matched nothing anywhere, retry once with a synonym variant
 * of the term (e.g. "lavandina" -> "cloro") against every store, then score
 * the results against the ORIGINAL term so matches stay keyed by what the
 * user typed. Bounded to MAX_SYNONYM_RETRY_TERMS terms per call.
 */
async function retryNotFoundWithSynonyms(
  notFoundTerms: string[],
  city: string | null | undefined,
  limiter: Limiter,
  storeResults: Map<string, Map<string, TermResult>>,
): Promise<{ term: string; results: StoreSearchResult[] }[]> {
  const termsToRetry = notFoundTerms
    .map((term) => ({ term, variants: expandTermVariants(term).slice(1) }))
    .filter((entry) => entry.variants.length > 0)
    .slice(0, MAX_SYNONYM_RETRY_TERMS);

  if (termsToRetry.length === 0) return [];

  const retryResults = await Promise.all(
    termsToRetry.map(async ({ term, variants }) => {
      const firstVariant = variants[0];
      if (firstVariant === undefined) return { term, results: [] };
      return { term, results: await searchAllStores(firstVariant, city ?? null, limiter) };
    }),
  );

  for (const { term, results } of retryResults) {
    for (const storeResult of results) {
      if (storeResult.failed || storeResult.products.length === 0) continue;

      const ranked = pickRankedMatches(term, storeResult.products);
      if (!ranked) continue;

      let termMap = storeResults.get(storeResult.storeName);
      if (!termMap) {
        termMap = new Map();
        storeResults.set(storeResult.storeName, termMap);
      }
      if (!termMap.has(term)) {
        termMap.set(term, ranked);
      }
    }
  }

  return retryResults;
}

// ============================================
// Public API
// ============================================

/**
 * Caps simultaneous outbound store fetches across every term in a single
 * compareProducts call. Without this, N terms x 11 stores can fire hundreds
 * of concurrent requests, which triggers store-side rate limiting and blows
 * past the 60s serverless function budget (maxDuration in shopping-plan route).
 */
const MAX_CONCURRENT_STORE_REQUESTS = 8;

/** Search all supermarkets for a list of products and build comparison carts. */
export async function compareProducts(
  searchInput: string[] | SearchItem[],
  city?: string | null,
  promoStores?: Set<string> | null,
): Promise<ShoppingPlanResult> {
  const searchItems = normalizeSearchItems(searchInput);
  const searchTerms = searchItems.map((item) => item.term);
  if (searchTerms.length === 0) {
    return { storeCarts: [], notFound: [], unavailableStores: [], searchedAt: new Date().toISOString() };
  }

  const limiter = createLimiter(MAX_CONCURRENT_STORE_REQUESTS);

  // Search applicable stores for each term in parallel, sharing one limiter
  // so the term x store fan-out across this whole call stays bounded.
  const allResults = await Promise.all(
    searchTerms.map(async (term) => ({
      term,
      results: await searchAllStores(term, city, limiter),
    })),
  );

  // Organize: Map<storeName, Map<searchTerm, TermResult>>
  const storeResults = new Map<string, Map<string, TermResult>>();
  const storeAttempts = new Map<string, number>();
  const storeFailures = new Map<string, number>();

  for (const { term, results } of allResults) {
    for (const storeResult of results) {
      storeAttempts.set(storeResult.storeName, (storeAttempts.get(storeResult.storeName) ?? 0) + 1);

      if (storeResult.failed) {
        storeFailures.set(storeResult.storeName, (storeFailures.get(storeResult.storeName) ?? 0) + 1);
        continue;
      }
      if (storeResult.products.length === 0) continue;

      const ranked = pickRankedMatches(term, storeResult.products);
      if (!ranked) continue;

      let termMap = storeResults.get(storeResult.storeName);
      if (!termMap) {
        termMap = new Map();
        storeResults.set(storeResult.storeName, termMap);
      }

      termMap.set(term, ranked);
    }
  }

  // A store is unavailable only when it failed every term it was asked about,
  // never merely because it had no matching products for some terms.
  const unavailableStores = Array.from(storeAttempts.entries())
    .filter(([storeName, attempts]) => storeFailures.get(storeName) === attempts)
    .map(([storeName]) => storeName);

  const notFoundAfterFirstPass = findGloballyNotFoundTerms(searchTerms, storeResults);
  const retryResults = await retryNotFoundWithSynonyms(notFoundAfterFirstPass, city, limiter, storeResults);

  const { storeCarts, notFound } = buildStoreCarts(searchItems, storeResults, promoStores);
  const suggestions = buildSuggestionsForNotFound(notFound, [allResults, retryResults]);

  return {
    storeCarts,
    notFound,
    unavailableStores,
    searchedAt: new Date().toISOString(),
    ...(suggestions.length > 0 ? { suggestions } : {}),
  };
}
