/**
 * Store Scoring Engine
 *
 * Deterministic scoring of stores based on basket coverage,
 * discount quality, and price strength. No LLM involved.
 *
 * Formula:
 *   finalScore = coverage * 0.5 + avgDiscountScore * 0.3 + priceStrengthScore * 0.2
 *
 * All components are normalized to 0–1 range.
 */

import type { StoreBasketResult, BasketMatch } from "./basket-matcher";

// ============================================
// Types
// ============================================

export interface StoreScore {
  storeName: string;
  /** Final composite score (0–1) */
  finalScore: number;
  /** Basket coverage ratio (0–1) */
  coverageScore: number;
  /** Average discount quality across matched products (0–1) */
  discountScore: number;
  /** Price competitiveness relative to other stores (0–1) */
  priceStrengthScore: number;
  /** How many basket items this store covers */
  coverageCount: number;
}

// ============================================
// Weights
// ============================================

const WEIGHT_COVERAGE = 0.5;
const WEIGHT_DISCOUNT = 0.3;
const WEIGHT_PRICE_STRENGTH = 0.2;

// ============================================
// Discount score heuristics
// ============================================

/** Score a single product's discount quality (0–1) */
function scoreDiscount(match: BasketMatch): number {
  const { matchedProduct } = match;
  const discount = matchedProduct.discount.toLowerCase();

  // Explicit multi-buy deal → high score
  if (discount.includes("2x1") || discount.includes("3x2")) return 1.0;

  // Explicit percentage discount
  if (discount.includes("%")) return 0.8;

  // Has original price (implicit discount)
  if (matchedProduct.originalPrice) return 0.6;

  // No discount info
  return 0.2;
}

// ============================================
// Price strength
// ============================================

/**
 * Compute price strength for each store relative to other stores.
 * For each basket item, the cheapest store gets 1.0, the most
 * expensive gets 0.0, and others are interpolated linearly.
 * The store's priceStrengthScore is the weighted average across
 * all basket items it covers.
 */
function computePriceStrength(
  storeResults: StoreBasketResult[]
): Map<string, number> {
  const scores = new Map<string, number[]>();

  // Initialize score arrays
  for (const sr of storeResults) {
    scores.set(sr.storeName, []);
  }

  // Collect all basket items that appear in at least 2 stores
  const basketItemStores = new Map<string, Array<{ storeName: string; price: number; weight: number }>>();

  for (const sr of storeResults) {
    for (const match of sr.matches) {
      const itemKey = match.basketItem.name;
      const price = parsePriceNum(match.matchedProduct.price);
      if (price === null) continue;

      const entries = basketItemStores.get(itemKey) ?? [];
      entries.push({ storeName: sr.storeName, price, weight: match.basketItem.weight });
      basketItemStores.set(itemKey, entries);
    }
  }

  // Score each basket item per store
  for (const [, entries] of basketItemStores) {
    if (entries.length < 2) {
      // Only one store has this item — neutral score
      for (const entry of entries) {
        scores.get(entry.storeName)?.push(0.5);
      }
      continue;
    }

    const prices = entries.map((e) => e.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;

    for (const entry of entries) {
      // Normalized: cheapest = 1.0, most expensive = 0.0
      const normalized = range > 0
        ? 1.0 - (entry.price - minPrice) / range
        : 0.5;
      scores.get(entry.storeName)?.push(normalized);
    }
  }

  // Average each store's scores
  const result = new Map<string, number>();
  for (const [storeName, itemScores] of scores) {
    if (itemScores.length === 0) {
      result.set(storeName, 0);
      continue;
    }
    const avg = itemScores.reduce((sum, s) => sum + s, 0) / itemScores.length;
    result.set(storeName, avg);
  }

  return result;
}

// ============================================
// Main function
// ============================================

/**
 * Score and rank stores based on basket coverage, discount quality,
 * and price competitiveness. Returns scores sorted by finalScore desc.
 */
export function scoreStores(storeResults: StoreBasketResult[]): StoreScore[] {
  if (storeResults.length === 0) return [];

  const priceStrengthMap = computePriceStrength(storeResults);

  const scored = storeResults.map((sr) => {
    const coverageScore = sr.coverageRatio;

    const discountScore = sr.matches.length > 0
      ? sr.matches.reduce((sum, m) => sum + scoreDiscount(m), 0) / sr.matches.length
      : 0;

    const priceStrengthScore = priceStrengthMap.get(sr.storeName) ?? 0;

    const finalScore =
      coverageScore * WEIGHT_COVERAGE +
      discountScore * WEIGHT_DISCOUNT +
      priceStrengthScore * WEIGHT_PRICE_STRENGTH;

    return {
      storeName: sr.storeName,
      finalScore: Math.round(finalScore * 1000) / 1000,
      coverageScore: Math.round(coverageScore * 1000) / 1000,
      discountScore: Math.round(discountScore * 1000) / 1000,
      priceStrengthScore: Math.round(priceStrengthScore * 1000) / 1000,
      coverageCount: sr.coverageCount,
    };
  });

  return scored.sort((a, b) => b.finalScore - a.finalScore);
}

// ============================================
// Helpers
// ============================================

function parsePriceNum(priceStr: string): number | null {
  const cleaned = priceStr.replace(/[$ \t]/g, "");
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  const parsed = parseFloat(cleaned.replace(/,/g, ""));
  return isNaN(parsed) ? null : parsed;
}
