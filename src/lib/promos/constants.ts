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

/**
 * Word-boundary tokens for validating that a promoarg.com title actually
 * refers to the expected supermarket. Only stores with short/ambiguous names
 * need explicit overrides — others use their own name as the token.
 */
export const STORE_TITLE_TOKENS: Record<string, string[]> = {
  "Dia": ["dia"],
  "Vea": ["vea"],
  "Coop. Obrera": ["cooperativa", "coop. obrera", "coop obrera"],
  "HiperLibertad": ["hiperlibertad"],
  "Mas Online": ["mas online"],
};

// ============================================
// Pipeline settings
// ============================================

/** Stale RUNNING pipeline timeout (ms). */
export const STALE_PIPELINE_TIMEOUT_MS = 5 * 60 * 1000;
