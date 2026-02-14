/**
 * Basket Matcher
 *
 * Matches extracted deal products to the Habita Base Basket
 * per store, producing a coverage map. Pure function — no
 * side effects, no LLM calls.
 */

import {
  HABITA_BASE_BASKET,
  matchesBasketItem,
} from "@/lib/llm/core/basket/habita-basket";

import type { BasketItem } from "@/lib/llm/core/basket/habita-basket";
import type { StoreCluster, ProductPrice } from "@/lib/llm/grocery-advisor";

// ============================================
// Types
// ============================================

/** A basket item matched to a specific product in a store */
export interface BasketMatch {
  basketItem: BasketItem;
  matchedProduct: ProductPrice;
}

/** Per-store result of basket matching */
export interface StoreBasketResult {
  storeName: string;
  matches: BasketMatch[];
  /** Number of basket items covered (0–15) */
  coverageCount: number;
  /** Coverage ratio (0–1) */
  coverageRatio: number;
}

// ============================================
// Main function
// ============================================

/**
 * Match each store's products against the base basket.
 * For each basket item, we pick the best-priced match in that store.
 */
export function matchBasket(clusters: StoreCluster[]): StoreBasketResult[] {
  return clusters.map((cluster) => matchStoreToBasket(cluster));
}

// ============================================
// Internal
// ============================================

function matchStoreToBasket(cluster: StoreCluster): StoreBasketResult {
  const matches: BasketMatch[] = [];

  for (const basketItem of HABITA_BASE_BASKET) {
    const matchingProducts = cluster.products.filter((p) =>
      matchesBasketItem(p.productName, basketItem)
    );

    if (matchingProducts.length === 0) continue;

    // Pick the cheapest match for this basket item
    const bestMatch = pickCheapest(matchingProducts);
    if (bestMatch) {
      matches.push({ basketItem, matchedProduct: bestMatch });
    }
  }

  return {
    storeName: cluster.storeName,
    matches,
    coverageCount: matches.length,
    coverageRatio: matches.length / HABITA_BASE_BASKET.length,
  };
}

/**
 * Pick the product with the lowest parsed price.
 * Falls back to the first product if prices can't be parsed.
 */
function pickCheapest(products: ProductPrice[]): ProductPrice | undefined {
  if (products.length === 0) return undefined;
  if (products.length === 1) return products[0];

  let best = products[0]!;
  let bestPrice = parsePriceNum(best.price);

  for (let i = 1; i < products.length; i++) {
    const product = products[i]!;
    const price = parsePriceNum(product.price);
    if (price !== null && (bestPrice === null || price < bestPrice)) {
      best = product;
      bestPrice = price;
    }
  }

  return best;
}

/** Simple price parser — extracts numeric value from "$X.XXX" or "$X.XXX,XX" */
function parsePriceNum(priceStr: string): number | null {
  const cleaned = priceStr.replace(/[$ \t]/g, "");
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  const parsed = parseFloat(cleaned.replace(/,/g, ""));
  return isNaN(parsed) ? null : parsed;
}
