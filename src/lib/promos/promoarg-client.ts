/**
 * Client for the promoarg.com REST API.
 *
 * Fetches paginated bank promotions per supermarket store.
 * API: GET https://www.promoarg.com/api/promotions?search={store}&page={n}
 */

import { PROMOARG_API_URL, FETCH_CONCURRENCY } from "./constants";

import type { PromoargResponse, PromoargPromotion, StorePromosResult } from "./types";

// ============================================
// Search term overrides
// ============================================

/** Some store names need different search terms to match promoarg.com results. */
const STORE_SEARCH_TERMS: Record<string, string> = {
  "Coop. Obrera": "cooperativa obrera",
  "HiperLibertad": "libertad",
};

// ============================================
// Public API
// ============================================

/** Fetch promos for all stores with concurrency control. */
export async function fetchAllStorePromos(
  storeNames: string[],
): Promise<StorePromosResult[]> {
  const results: StorePromosResult[] = [];

  for (let i = 0; i < storeNames.length; i += FETCH_CONCURRENCY) {
    const batch = storeNames.slice(i, i + FETCH_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((name) => fetchStorePromos(name)),
    );
    results.push(...batchResults);
  }

  const withPromos = results.filter((r) => r.promos.length > 0).length;
  console.log(
    `[promoarg-client] ${withPromos}/${storeNames.length} stores returned promos`,
  );

  return results;
}

// ============================================
// Per-store fetch (paginated)
// ============================================

async function fetchStorePromos(storeName: string): Promise<StorePromosResult> {
  const searchTerm = STORE_SEARCH_TERMS[storeName] ?? storeName.toLowerCase();
  const allPromos: PromoargPromotion[] = [];

  try {
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const url = `${PROMOARG_API_URL}?search=${encodeURIComponent(searchTerm)}&page=${page}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`[promoarg-client] ${storeName} page ${page}: HTTP ${response.status}`);
        break;
      }

      const data = (await response.json()) as PromoargResponse;
      allPromos.push(...data.promotions);
      totalPages = data.totalPages;
      page++;
    }

    console.log(`[promoarg-client] ${storeName}: ${allPromos.length} promos (${totalPages} pages)`);
  } catch (error) {
    console.warn(
      `[promoarg-client] ${storeName} failed:`,
      error instanceof Error ? error.message : error,
    );
  }

  return { storeName, promos: allPromos };
}
