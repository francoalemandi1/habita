/**
 * Pure normalization of raw promoarg.com promos into a household-agnostic shape.
 *
 * Extracted from the pipeline so MCP tools can reuse it without a householdId
 * or Prisma row shape — see run-pipeline.ts for the DB mapping step.
 */

import { STORE_TITLE_TOKENS } from "./constants";
import { getBankDisplayName, resolvePromoBank } from "./bank-mapping";

import type { PromoargPromotion, StorePromosResult } from "./types";

// ============================================
// Types
// ============================================

/** A normalized promo, independent of household/DB row shape. */
export interface NormalizedPromo {
  storeName: string;
  promoargId: string;
  bankSlug: string;
  bankDisplayName: string;
  title: string | null;
  description: string | null;
  discountPercent: number;
  daysOfWeek: string[];
  paymentMethods: string[];
  eligiblePlans: string[];
  capAmount: number | null;
  categories: string[];
  validUntil: Date | null;
  sourceUrl: string | null;
}

// ============================================
// Normalization helpers
// ============================================

/** Normalize unaccented Spanish day names from the API to canonical accented form. */
const DAY_ACCENT_MAP: Record<string, string> = {
  Miercoles: "Miércoles",
  Sabado: "Sábado",
};

export function normalizeDayName(day: string): string {
  return DAY_ACCENT_MAP[day] ?? day;
}

/** Escape special regex characters in a literal string. */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns true when at least one token for this store appears in the title
 * as a whole word (word-boundary match, case-insensitive).
 */
export function promoTitleMatchesStore(title: string, storeName: string): boolean {
  const tokens = STORE_TITLE_TOKENS[storeName] ?? [storeName.toLowerCase()];
  const normalizedTitle = title.toLowerCase();
  return tokens.some((token) => {
    const pattern = new RegExp(`\\b${escapeRegex(token)}\\b`, "i");
    return pattern.test(normalizedTitle);
  });
}

// ============================================
// Public API
// ============================================

/**
 * Filter, dedup and normalize raw promoarg.com promos for every store.
 *
 * Dedup key: bankId + discountPercentage + sorted validDays.
 * Promos with the same key but different eligiblePlans get merged.
 */
export function normalizeStorePromos(storeResults: StorePromosResult[]): NormalizedPromo[] {
  const normalized: NormalizedPromo[] = [];

  for (const { storeName, promos } of storeResults) {
    // Filter: only promos with an actual discount
    const withDiscount = promos.filter(
      (p) => p.discountPercentage !== null && p.discountPercentage > 0,
    );

    // Filter: only promos whose title actually references this store
    const relevant = withDiscount.filter((p) => {
      if (!p.title) return false;
      return promoTitleMatchesStore(p.title, storeName);
    });

    const dropped = withDiscount.length - relevant.length;
    if (dropped > 0) {
      console.log(`[promos-pipeline] ${storeName}: dropped ${dropped} off-topic promos after title filter`);
    }

    // Dedup: merge by bankId + % + days
    const dedupMap = new Map<string, PromoargPromotion & { mergedPlans: string[] }>();

    for (const promo of relevant) {
      const days = Array.isArray(promo.validDays) ? promo.validDays.map(normalizeDayName) : [];
      const plans = Array.isArray(promo.eligiblePlans) ? promo.eligiblePlans : [];
      const sortedDays = [...days].sort().join(",");
      const dedupKey = `${promo.bankId}|${promo.discountPercentage}|${sortedDays}`;

      const existing = dedupMap.get(dedupKey);
      if (existing) {
        // Merge eligiblePlans
        for (const plan of plans) {
          if (!existing.mergedPlans.includes(plan)) {
            existing.mergedPlans.push(plan);
          }
        }
      } else {
        dedupMap.set(dedupKey, { ...promo, validDays: days, mergedPlans: [...plans] });
      }
    }

    // Map to normalized records
    for (const promo of dedupMap.values()) {
      const participatingBanks = Array.isArray(promo.participatingBanks) ? promo.participatingBanks : null;
      const resolved = resolvePromoBank(promo.bankId, promo.title ?? null, participatingBanks);

      const existingMethods =
        Array.isArray(promo.paymentMethods) && promo.paymentMethods.length > 0
          ? promo.paymentMethods
          : [];

      // When resolved to a real bank, inject the network label as first paymentMethod
      // so the UI can display "Ciudad · MODO" instead of just "MODO".
      const enrichedMethods = resolved
        ? [resolved.networkLabel, ...existingMethods.filter((m) => m !== resolved.networkLabel)]
        : existingMethods;

      normalized.push({
        storeName,
        promoargId: promo.id,
        bankSlug: resolved?.bankSlug ?? promo.bankId,
        bankDisplayName: resolved?.bankDisplayName ?? getBankDisplayName(promo.bankId),
        title: promo.title || null,
        description: promo.description || null,
        discountPercent: promo.discountPercentage!,
        daysOfWeek: promo.validDays,
        paymentMethods: enrichedMethods,
        eligiblePlans: promo.mergedPlans,
        capAmount: promo.capAmount ?? null,
        categories: Array.isArray(promo.categories) ? promo.categories : [],
        validUntil: promo.validUntil ? new Date(promo.validUntil) : null,
        sourceUrl: promo.detailsUrl ?? null,
      });
    }
  }

  return normalized;
}
