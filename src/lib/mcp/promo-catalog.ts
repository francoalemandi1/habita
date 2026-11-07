/**
 * Shared normalized bank-promo catalog loader + matching helpers for MCP tools.
 * Shared between get_bank_promos and compare_cart's promoOptions.
 */

import { z } from "zod";

import { KNOWN_STORE_NAMES } from "@/lib/promos/constants";
import { fetchAllStorePromos } from "@/lib/promos/promoarg-client";
import { normalizeStorePromos } from "@/lib/promos/normalize";
import { cacheGet, cacheSet, PROMOS_CACHE_KEY, PROMOS_CACHE_TTL_SECONDS } from "./cache";

import type { NormalizedPromo } from "@/lib/promos/normalize";
import type { Weekday } from "./weekday";

// ============================================
// Cached catalog (normalized, dates as ISO strings)
// ============================================

const cachedPromoSchema = z.object({
  storeName: z.string(),
  promoargId: z.string(),
  bankSlug: z.string(),
  bankDisplayName: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  discountPercent: z.number(),
  daysOfWeek: z.array(z.string()),
  paymentMethods: z.array(z.string()),
  eligiblePlans: z.array(z.string()),
  capAmount: z.number().nullable(),
  categories: z.array(z.string()),
  validUntil: z.string().nullable(),
  sourceUrl: z.string().nullable(),
});
const cachedCatalogSchema = z.array(cachedPromoSchema);

export type CachedPromo = z.infer<typeof cachedPromoSchema>;

function toCachedPromo(promo: NormalizedPromo): CachedPromo {
  return { ...promo, validUntil: promo.validUntil ? promo.validUntil.toISOString() : null };
}

/** Load the normalized promo catalog, from cache when valid, else fetch fresh and cache it. */
export async function loadPromoCatalog(): Promise<CachedPromo[]> {
  const cached = await cacheGet<unknown>(PROMOS_CACHE_KEY);
  if (cached) {
    const parsed = cachedCatalogSchema.safeParse(cached);
    if (parsed.success) return parsed.data;
  }

  const storeResults = await fetchAllStorePromos(KNOWN_STORE_NAMES);
  const normalized = normalizeStorePromos(storeResults).map(toCachedPromo);
  await cacheSet(PROMOS_CACHE_KEY, normalized, PROMOS_CACHE_TTL_SECONDS);
  return normalized;
}

// ============================================
// Matching helpers
// ============================================

export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Like normalizeForMatch, but also strips whitespace — for slug-style comparisons ("mercado pago" ↔ "mercadopago"). */
function normalizeSlug(text: string): string {
  return normalizeForMatch(text).replace(/\s+/g, "");
}

export function isPromoExpired(promo: CachedPromo, now: Date): boolean {
  if (!promo.validUntil) return false;
  return new Date(promo.validUntil) < now;
}

/** Empty daysOfWeek means the promo applies every day. */
export function promoAppliesOnDay(promo: CachedPromo, day: Weekday): boolean {
  if (promo.daysOfWeek.length === 0) return true;
  return promo.daysOfWeek.some((d) => normalizeForMatch(d) === normalizeForMatch(day));
}

/** Exact match (case/accent-insensitive) against bankSlug or bankDisplayName. */
export function matchesBankFilter(promo: CachedPromo, bank: string): boolean {
  const normalizedBank = normalizeForMatch(bank);
  return (
    normalizeForMatch(promo.bankSlug) === normalizedBank ||
    normalizeForMatch(promo.bankDisplayName) === normalizedBank
  );
}

/**
 * Matches when any of `paymentMethods` equals (case/accent/slug-insensitive) the
 * promo's bankSlug, bankDisplayName, or any of its paymentMethods.
 */
export function matchesAnyPaymentMethod(promo: CachedPromo, paymentMethods: string[]): boolean {
  return paymentMethods.some((method) => {
    const normalized = normalizeForMatch(method);
    const slug = normalizeSlug(method);
    if (normalizeSlug(promo.bankSlug) === slug) return true;
    if (normalizeForMatch(promo.bankDisplayName) === normalized) return true;
    return promo.paymentMethods.some((pm) => normalizeForMatch(pm) === normalized || normalizeSlug(pm) === slug);
  });
}
