/**
 * Shared normalized bank-promo catalog loader + matching helpers for MCP tools.
 * Shared between get_bank_promos and compare_cart's promoOptions.
 */

import { after } from "next/server";
import { z } from "zod";

import { KNOWN_STORE_NAMES } from "@/lib/promos/constants";
import { fetchAllStorePromos } from "@/lib/promos/promoarg-client";
import { normalizeStorePromos } from "@/lib/promos/normalize";
import {
  cacheGet,
  cacheSet,
  cacheSetIfAbsent,
  PROMOS_CACHE_KEY,
  PROMOS_CACHE_TTL_SECONDS,
  PROMOS_REFRESH_LOCK_KEY,
  PROMOS_REFRESH_LOCK_TTL_SECONDS,
  PROMOS_STALE_AFTER_SECONDS,
} from "./cache";

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
const cachedCatalogEntrySchema = z.object({
  fetchedAt: z.string(),
  promos: z.array(cachedPromoSchema),
});

export type CachedPromo = z.infer<typeof cachedPromoSchema>;
export type PromoCatalog = z.infer<typeof cachedCatalogEntrySchema>;

function toCachedPromo(promo: NormalizedPromo): CachedPromo {
  return { ...promo, validUntil: promo.validUntil ? promo.validUntil.toISOString() : null };
}

async function readCachedCatalog(): Promise<PromoCatalog | null> {
  const cached = await cacheGet<unknown>(PROMOS_CACHE_KEY);
  if (cached === null) return null;
  const parsed = cachedCatalogEntrySchema.safeParse(cached);
  if (!parsed.success) {
    console.warn("[mcp/promo-catalog] Cached catalog has an unexpected shape — refetching", parsed.error.issues[0]);
    return null;
  }
  return parsed.data;
}

async function fetchAndStoreCatalog(): Promise<PromoCatalog> {
  const storeResults = await fetchAllStorePromos(KNOWN_STORE_NAMES);
  const catalog = {
    fetchedAt: new Date().toISOString(),
    promos: normalizeStorePromos(storeResults).map(toCachedPromo),
  };
  await cacheSet(PROMOS_CACHE_KEY, catalog, PROMOS_CACHE_TTL_SECONDS);
  return catalog;
}

/** Runs `work` after the response is sent, keeping the function alive until it settles. */
function runAfterResponse(work: () => Promise<void>): void {
  try {
    after(work);
  } catch (error) {
    // Outside a request scope (scripts, tests) there is no response to wait for.
    console.warn(
      "[mcp/promo-catalog] after() unavailable — running in the background:",
      error instanceof Error ? error.message : error,
    );
    void work();
  }
}

async function refreshCatalogInBackground(): Promise<void> {
  if (!(await cacheSetIfAbsent(PROMOS_REFRESH_LOCK_KEY, PROMOS_REFRESH_LOCK_TTL_SECONDS))) return;
  try {
    await fetchAndStoreCatalog();
  } catch (error) {
    console.error("[mcp/promo-catalog] Background refresh failed — keeping the stale catalog", error);
  }
}

function isStale(catalog: PromoCatalog, now: Date): boolean {
  const ageSeconds = (now.getTime() - new Date(catalog.fetchedAt).getTime()) / 1000;
  return ageSeconds > PROMOS_STALE_AFTER_SECONDS;
}

/**
 * Stale-while-revalidate: a cached catalog is always served, and one older than
 * PROMOS_STALE_AFTER_SECONDS is refreshed after the response. Only an empty
 * cache (first deploy, Redis flush) makes the caller wait for promoarg.
 */
export async function loadPromoCatalog(now: Date = new Date()): Promise<PromoCatalog> {
  const cached = await readCachedCatalog();
  if (cached) {
    if (isStale(cached, now)) runAfterResponse(refreshCatalogInBackground);
    return cached;
  }

  const freshCatalog = fetchAndStoreCatalog();
  // If the caller gives up on its deadline, the fetch still finishes and fills the cache.
  runAfterResponse(() => freshCatalog.then(() => undefined, () => undefined));
  return freshCatalog;
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
