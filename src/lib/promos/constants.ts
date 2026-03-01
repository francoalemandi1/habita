/**
 * Constants for the bank promotions pipeline.
 */

import { SUPERMARKET_STORES } from "@/lib/vtex-client";

// ============================================
// promoarg.com API
// ============================================

/** Base URL for the promoarg.com promotions API. */
export const PROMOARG_API_URL = "https://www.promoarg.com/api/promotions";

/** Max concurrent store fetches. */
export const FETCH_CONCURRENCY = 3;

// ============================================
// Store matching
// ============================================

/** Canonical store names from the supermarket search system. */
export const KNOWN_STORE_NAMES = SUPERMARKET_STORES.map((s) => s.name);

// ============================================
// Pipeline settings
// ============================================

/** Stale RUNNING pipeline timeout (ms). */
export const STALE_PIPELINE_TIMEOUT_MS = 5 * 60 * 1000;
