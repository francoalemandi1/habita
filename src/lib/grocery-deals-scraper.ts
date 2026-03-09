/**
 * Grocery Deals Scraper
 *
 * Replaces the Tavily+LLM pipeline (grocery-advisor.ts) with direct
 * supermarket API scraping. Reuses the existing VTEX/Coto/Coope scrapers
 * from vtex-client.ts and the scoring/clustering logic.
 *
 * Architecture:
 *   1. Load ProductCatalog items for the requested category
 *   2. For each product, search all applicable stores (searchAllStores)
 *   3. Pick best match per store (pickRankedMatches from supermarket-search)
 *   4. Convert VtexProduct → ProductPrice
 *   5. Cluster by store, score, generate recommendation (deterministic)
 */

import { prisma } from "@/lib/prisma";
import { searchAllStores } from "@/lib/vtex-client";
import { pickRankedMatches } from "@/lib/supermarket-search";
import { matchBasket } from "@/lib/llm/core/scoring/basket-matcher";
import { scoreStores } from "@/lib/llm/core/scoring/store-scorer";
import { buildStoreRecommendation } from "@/lib/llm/core/recommendation/build-recommendation";

import type { VtexProduct } from "@/lib/vtex-client";
import type { GroceryCategory } from "@prisma/client";
import type { StoreScore } from "@/lib/llm/core/scoring/store-scorer";
import type { StoreRecommendation } from "@/lib/llm/core/recommendation/build-recommendation";

// ============================================
// Types (moved from grocery-advisor.ts)
// ============================================

export type GroceryTab =
  | "almacen"
  | "panaderia_dulces"
  | "lacteos"
  | "carnes"
  | "frutas_verduras"
  | "bebidas"
  | "limpieza"
  | "perfumeria";

export type { StoreScore, StoreRecommendation };

export interface ProductPrice {
  productName: string;
  store: string;
  price: string;
  originalPrice: string | null;
  discount: string;
  savingsPercent: number | null;
  sourceUrl: string;
  source: string;
}

export interface StoreCluster {
  storeName: string;
  productCount: number;
  products: ProductPrice[];
  totalEstimatedSavings: number;
  averageDiscountPercent: number;
  score: number;
}

export interface GroceryAdvisorResult {
  clusters: StoreCluster[];
  recommendation: string;
  productsNotFound: string[];
  generatedAt: string;
  storeScores: StoreScore[];
  storeRecommendation: StoreRecommendation;
}

// ============================================
// Constants
// ============================================

const TAB_TO_ENUM: Record<GroceryTab, GroceryCategory> = {
  almacen: "ALMACEN",
  panaderia_dulces: "PANADERIA_DULCES",
  lacteos: "LACTEOS",
  carnes: "CARNES",
  frutas_verduras: "FRUTAS_VERDURAS",
  bebidas: "BEBIDAS",
  limpieza: "LIMPIEZA",
  perfumeria: "PERFUMERIA",
};

const SCRAPE_CONCURRENCY = 4;
const MIN_MEANINGFUL_DISCOUNT_PERCENT = 5;

// ============================================
// Price helpers
// ============================================

function formatPriceARS(amount: number): string {
  const formatted = Math.round(amount).toLocaleString("es-AR");
  return `$${formatted}`;
}

function parsePrice(priceStr: string): number | null {
  const cleaned = priceStr.replace(/[$ \t]/g, "");
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  const parsed = parseFloat(cleaned.replace(/,/g, ""));
  return isNaN(parsed) ? null : parsed;
}

function calculateSavingsPercent(discounted: number, regular: number): number {
  if (regular <= 0) return 0;
  return Math.round(((regular - discounted) / regular) * 100);
}

// ============================================
// VtexProduct → ProductPrice conversion
// ============================================

function vtexToProductPrice(
  catalogName: string,
  storeName: string,
  product: VtexProduct,
): ProductPrice {
  const price = product.price;
  const listPrice = product.listPrice;

  const formattedPrice = formatPriceARS(price);

  let savingsPercent: number | null = null;
  let discount = "";
  let formattedOriginal: string | null = null;

  if (listPrice && listPrice > price) {
    savingsPercent = calculateSavingsPercent(price, listPrice);
    if (savingsPercent >= MIN_MEANINGFUL_DISCOUNT_PERCENT) {
      discount = `${savingsPercent}% off`;
      formattedOriginal = formatPriceARS(listPrice);
    } else {
      savingsPercent = null;
    }
  }

  return {
    productName: catalogName,
    store: storeName,
    price: formattedPrice,
    originalPrice: formattedOriginal,
    discount,
    savingsPercent,
    sourceUrl: product.link,
    source: storeName,
  };
}

// ============================================
// Cluster by store
// ============================================

function clusterByStore(prices: ProductPrice[]): StoreCluster[] {
  const storeMap = new Map<string, ProductPrice[]>();

  for (const price of prices) {
    const existing = storeMap.get(price.store) ?? [];
    if (!existing.some((p) => p.productName === price.productName)) {
      existing.push(price);
      storeMap.set(price.store, existing);
    }
  }

  return Array.from(storeMap.entries()).map(([storeName, products]) => {
    const totalSavings = products.reduce((sum, p) => {
      if (p.savingsPercent === null || p.savingsPercent <= 0) return sum;
      const currentNum = parsePrice(p.price);
      const originalNum = p.originalPrice ? parsePrice(p.originalPrice) : null;
      if (currentNum !== null && originalNum !== null) {
        return sum + (originalNum - currentNum);
      }
      return sum;
    }, 0);

    const discountedProducts = products.filter((p) => p.savingsPercent !== null && p.savingsPercent > 0);
    const avgDiscount = discountedProducts.length > 0
      ? Math.round(discountedProducts.reduce((s, p) => s + (p.savingsPercent ?? 0), 0) / discountedProducts.length)
      : 0;

    return {
      storeName,
      productCount: products.length,
      products,
      totalEstimatedSavings: Math.round(totalSavings),
      averageDiscountPercent: avgDiscount,
      score: 0,
    };
  });
}

function scoreAndSort(clusters: StoreCluster[]): StoreCluster[] {
  return clusters
    .map((cluster) => ({
      ...cluster,
      score: cluster.productCount * 3 + cluster.totalEstimatedSavings * 0.01 + cluster.averageDiscountPercent * 0.5,
    }))
    .sort((a, b) => b.score - a.score);
}

// ============================================
// Main function
// ============================================

/**
 * Generate grocery deals for a category and city using direct supermarket scrapers.
 * No Tavily, no LLM — just real prices from store APIs.
 */
export async function generateGroceryDealsScraper(
  category: GroceryTab,
  city: string,
): Promise<GroceryAdvisorResult | null> {
  const categoryEnum = TAB_TO_ENUM[category];

  // 1. Load catalog products
  const catalogProducts = await prisma.productCatalog.findMany({
    where: { category: categoryEnum, isActive: true },
    orderBy: { name: "asc" },
  });

  if (catalogProducts.length === 0) {
    console.warn(`[grocery-scraper] No catalog products for category ${categoryEnum}`);
    return null;
  }

  // 2. Search all stores for each product (batched)
  const allPrices: ProductPrice[] = [];
  const foundProductNames = new Set<string>();

  for (let i = 0; i < catalogProducts.length; i += SCRAPE_CONCURRENCY) {
    const batch = catalogProducts.slice(i, i + SCRAPE_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (product) => {
        const searchTerm = product.searchTerms || product.name;
        const storeResults = await searchAllStores(searchTerm, city);
        return { product, storeResults };
      }),
    );

    for (const { product, storeResults } of batchResults) {
      for (const storeResult of storeResults) {
        if (storeResult.failed || storeResult.products.length === 0) continue;

        // 3. Pick best match using scoring
        const ranked = pickRankedMatches(product.name, storeResult.products);
        if (!ranked) continue;

        // 4. Convert to ProductPrice
        const pp = vtexToProductPrice(
          product.name,
          storeResult.storeName,
          ranked.product,
        );
        allPrices.push(pp);
        foundProductNames.add(product.name);
      }
    }
  }

  if (allPrices.length === 0) {
    console.warn(`[grocery-scraper] No prices found for ${city} (category: ${category})`);
    return null;
  }

  console.log(`[grocery-scraper] [${category}] ${city}: ${allPrices.length} prices from ${new Set(allPrices.map((p) => p.store)).size} stores`);

  // 5. Cluster by store
  const clusters = clusterByStore(allPrices);

  // 6. Score and sort (legacy)
  const scoredClusters = scoreAndSort(clusters);

  // 7. Basket matching + store scoring + recommendation
  const basketResults = matchBasket(scoredClusters);
  const storeScores = scoreStores(basketResults);
  const storeRecommendation = buildStoreRecommendation(storeScores, scoredClusters);

  // Re-sort by basket-aware store score
  const storeScoreMap = new Map(storeScores.map((s) => [s.storeName, s.finalScore]));
  const finalClusters = scoredClusters.sort((a, b) => {
    const scoreA = storeScoreMap.get(a.storeName) ?? 0;
    const scoreB = storeScoreMap.get(b.storeName) ?? 0;
    return scoreB - scoreA;
  });

  const productNames = catalogProducts.map((p) => p.name);
  const productsNotFound = productNames.filter((n) => !foundProductNames.has(n));

  if (productsNotFound.length > 0) {
    console.log(`[grocery-scraper] [${category}] Not found (${productsNotFound.length}/${productNames.length}): ${productsNotFound.join(", ")}`);
  }

  return {
    clusters: finalClusters,
    recommendation: storeRecommendation.text,
    productsNotFound,
    generatedAt: new Date().toISOString(),
    storeScores,
    storeRecommendation,
  };
}

// ============================================
// City normalization
// ============================================

export function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
