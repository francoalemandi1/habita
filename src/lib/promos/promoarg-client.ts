/**
 * Client for the promoarg.com REST API.
 *
 * Fetches paginated bank promotions per supermarket store.
 * API: GET https://www.promoarg.com/api/promotions?search={store}&page={n}
 */

import { createLimiter } from "@/lib/concurrency";

import { PROMOARG_API_URL, FETCH_CONCURRENCY } from "./constants";

import type { Limiter } from "@/lib/concurrency";

import type { PromoargResponse, StorePromosResult } from "./types";

// ============================================
// Search term overrides
// ============================================

/** Some store names need different search terms to match promoarg.com results. */
const PAGE_REQUEST_TIMEOUT_MS = 10_000;

const STORE_SEARCH_TERMS: Record<string, string> = {
  "Coop. Obrera": "cooperativa obrera",
};

// ============================================
// Public API
// ============================================

/**
 * Fetch promos for all stores. Every page request across every store shares one
 * limiter: promoarg's search is fuzzy ("dia" returns ~316 pages of the whole
 * catalog), so fetching pages one by one took ~28 s; in parallel ~12 s.
 */
export async function fetchAllStorePromos(
  storeNames: string[],
): Promise<StorePromosResult[]> {
  const limiter = createLimiter(FETCH_CONCURRENCY);
  const results = await Promise.all(storeNames.map((name) => fetchStorePromos(name, limiter)));

  const withPromos = results.filter((r) => r.promos.length > 0).length;
  console.log(
    `[promoarg-client] ${withPromos}/${storeNames.length} stores returned promos`,
  );

  return results;
}

// ============================================
// Per-store fetch (paginated)
// ============================================

/** Guards against a runaway totalPages; the largest store ("dia") had 316 pages on 2026-11-07. */
const MAX_PAGES_PER_STORE = 500;

async function fetchPromoargPage(searchTerm: string, page: number): Promise<PromoargResponse> {
  const url = `${PROMOARG_API_URL}?search=${encodeURIComponent(searchTerm)}&page=${page}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(PAGE_REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`page ${page}: HTTP ${response.status}`);
  return (await response.json()) as PromoargResponse;
}

/** Page 1 tells how many pages exist; the rest are fetched in parallel. A failed page is skipped, not fatal. */
async function fetchStorePromos(storeName: string, limiter: Limiter): Promise<StorePromosResult> {
  const searchTerm = STORE_SEARCH_TERMS[storeName] ?? storeName.toLowerCase();

  let firstPage: PromoargResponse;
  try {
    firstPage = await limiter.run(() => fetchPromoargPage(searchTerm, 1));
  } catch (error) {
    console.warn(`[promoarg-client] ${storeName} failed:`, error instanceof Error ? error.message : error);
    return { storeName, promos: [] };
  }

  const totalPages = Math.min(firstPage.totalPages, MAX_PAGES_PER_STORE);
  const remainingPageNumbers = Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) => index + 2);
  const remainingPages = await Promise.allSettled(
    remainingPageNumbers.map((page) => limiter.run(() => fetchPromoargPage(searchTerm, page))),
  );

  const promos = [...firstPage.promotions];
  remainingPages.forEach((pageResult) => {
    if (pageResult.status === "fulfilled") {
      promos.push(...pageResult.value.promotions);
      return;
    }
    const reason: unknown = pageResult.reason;
    console.warn(`[promoarg-client] ${storeName} ${reason instanceof Error ? reason.message : String(reason)}`);
  });

  console.log(`[promoarg-client] ${storeName}: ${promos.length} promos (${totalPages} pages)`);
  return { storeName, promos };
}
