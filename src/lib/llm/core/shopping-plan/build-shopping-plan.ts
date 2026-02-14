/**
 * Shopping Plan Builder
 *
 * Aggregates Precios Claros product prices into a unified
 * ShoppingPlan that ranks stores by total basket cost.
 *
 * Pure function — no LLM, no DB, no side effects.
 *
 * Pipeline:
 *   1. Group products by store banner
 *   2. For each store: compute basket cost, category coverage, price competitiveness
 *   3. Score and rank stores
 *   4. Build deterministic recommendation
 *   5. Collect products not found
 */

import {
  HABITA_BASE_BASKET,
  matchesBasketItem,
} from "@/lib/llm/core/basket/habita-basket";

import type { GroceryCategory } from "@prisma/client";
import type {
  ProductPrice,
  UnifiedStoreCluster,
  ShoppingPlan,
  ShoppingPlanConfidence,
} from "./types";

// ============================================
// Constants
// ============================================

const WEIGHT_PRODUCT_COVERAGE = 0.35;
const WEIGHT_CATEGORY_COVERAGE = 0.25;
const WEIGHT_PRICE_COMPETITIVENESS = 0.25;
const WEIGHT_BASKET_COVERAGE = 0.15;

const HIGH_CONFIDENCE_THRESHOLD = 0.5;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.3;

const MAX_STORES = 5;
const MIN_PRODUCTS_THRESHOLD = 3;

// ============================================
// Category labels for display
// ============================================

export const CATEGORY_LABELS: Record<GroceryCategory, string> = {
  ALMACEN: "Almacen",
  PANADERIA_DULCES: "Panaderia y Dulces",
  LACTEOS: "Lacteos",
  CARNES: "Carnes",
  FRUTAS_VERDURAS: "Frutas y Verduras",
  BEBIDAS: "Bebidas",
  LIMPIEZA: "Limpieza",
  PERFUMERIA: "Perfumeria",
};

// ============================================
// Input type
// ============================================

export interface BuildShoppingPlanInput {
  /** All product prices from Precios Claros */
  prices: ProductPrice[];
  /** Names of all products that were searched */
  searchedProductNames: string[];
  /** User location for distance calculation */
  userLatitude: number;
  userLongitude: number;
}

// ============================================
// Main function
// ============================================

export function buildShoppingPlan(input: BuildShoppingPlanInput): ShoppingPlan {
  const { prices, searchedProductNames, userLatitude, userLongitude } = input;

  if (prices.length === 0) {
    return emptyPlan();
  }

  const totalProductsSearched = searchedProductNames.length;

  // Step 1: Group by store, keeping cheapest price per product per store
  const storeMap = groupByStore(prices);

  // Step 2: Build price comparison map for competitiveness scoring
  const cheapestByProduct = buildCheapestMap(prices);

  // Step 3: Score each store
  const allStores = scoreStores(
    storeMap,
    cheapestByProduct,
    totalProductsSearched,
    userLatitude,
    userLongitude,
  );

  // Step 4: Filter and cap stores
  const stores = filterStores(allStores);

  // Step 5: Build recommendation
  const { recommendation, confidence, topStore } = buildRecommendation(
    stores,
    totalProductsSearched,
  );

  // Step 6: Collect not-found products
  const foundProducts = new Set(prices.map((p) => p.catalogProductName));
  const productsNotFound = searchedProductNames
    .filter((name) => !foundProducts.has(name))
    .sort();

  return {
    stores,
    recommendation,
    confidence,
    topStore,
    productsNotFound,
    totalProductsSearched,
    totalProductsFound: foundProducts.size,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================
// Step 1: Group by store
// ============================================

function groupByStore(
  prices: ProductPrice[],
): Map<string, ProductPrice[]> {
  const map = new Map<string, ProductPrice[]>();

  for (const price of prices) {
    const existing = map.get(price.store) ?? [];

    // Keep cheapest price per catalog product per store
    const existingIdx = existing.findIndex(
      (p) => p.catalogProductName === price.catalogProductName,
    );
    if (existingIdx >= 0) {
      if (price.price < existing[existingIdx]!.price) {
        existing[existingIdx] = price;
      }
    } else {
      existing.push(price);
    }

    map.set(price.store, existing);
  }

  return map;
}

// ============================================
// Step 2: Build cheapest price map
// ============================================

/** For each catalog product, find the cheapest price across all stores */
function buildCheapestMap(
  prices: ProductPrice[],
): Map<string, number> {
  const map = new Map<string, number>();

  for (const price of prices) {
    const current = map.get(price.catalogProductName);
    if (current === undefined || price.price < current) {
      map.set(price.catalogProductName, price.price);
    }
  }

  return map;
}

// ============================================
// Step 3: Score stores
// ============================================

function scoreStores(
  storeMap: Map<string, ProductPrice[]>,
  cheapestByProduct: Map<string, number>,
  totalProductsSearched: number,
  userLat: number,
  userLng: number,
): UnifiedStoreCluster[] {
  const clusters: UnifiedStoreCluster[] = [];

  for (const [storeName, products] of storeMap) {
    // Group by category
    const productsByCategory: Partial<Record<GroceryCategory, ProductPrice[]>> = {};
    for (const product of products) {
      const list = productsByCategory[product.category] ?? [];
      list.push(product);
      productsByCategory[product.category] = list;
    }

    const categoryCoverage = Object.keys(productsByCategory).length;
    const estimatedBasketCost = products.reduce((sum, p) => sum + p.price, 0);

    // Count how many products this store is cheapest for
    let cheapestCount = 0;
    for (const product of products) {
      const cheapest = cheapestByProduct.get(product.catalogProductName);
      if (cheapest !== undefined && product.price <= cheapest) {
        cheapestCount++;
      }
    }

    // Price competitiveness: for each product, score 1.0 if cheapest, 0.0 if most expensive
    const priceCompetitiveness = computePriceCompetitiveness(
      products,
      cheapestByProduct,
    );

    // Basket coverage
    const basketCoverage = computeBasketCoverage(products);

    // Scoring
    const productCoverageScore = totalProductsSearched > 0
      ? products.length / totalProductsSearched
      : 0;
    const categoryCoverageScore = categoryCoverage / 6; // 6 active categories
    const score =
      productCoverageScore * WEIGHT_PRODUCT_COVERAGE +
      categoryCoverageScore * WEIGHT_CATEGORY_COVERAGE +
      priceCompetitiveness * WEIGHT_PRICE_COMPETITIVENESS +
      basketCoverage * WEIGHT_BASKET_COVERAGE;

    // Distance — use the most common store location (mode of lat/lng)
    const representativeProduct = products[0]!;
    const distanceKm = haversineKm(
      userLat,
      userLng,
      representativeProduct.storeLat,
      representativeProduct.storeLng,
    );

    clusters.push({
      storeName,
      totalProductCount: products.length,
      productsByCategory,
      allProducts: products,
      estimatedBasketCost: Math.round(estimatedBasketCost),
      categoryCoverage,
      cheapestProductCount: cheapestCount,
      score: Math.round(score * 1000) / 1000,
      distanceKm: Math.round(distanceKm * 10) / 10,
      storeAddress: representativeProduct.storeAddress,
      storeLocality: representativeProduct.storeLocality,
    });
  }

  return clusters.sort((a, b) => b.score - a.score);
}

// ============================================
// Step 4: Filter stores
// ============================================

function filterStores(stores: UnifiedStoreCluster[]): UnifiedStoreCluster[] {
  if (stores.length === 0) return [];

  // Adaptive min-product filter
  const bestProductCount = stores[0]?.totalProductCount ?? 0;
  if (bestProductCount >= 5) {
    const filtered = stores.filter(
      (s) => s.totalProductCount >= MIN_PRODUCTS_THRESHOLD,
    );
    if (filtered.length > 0) {
      return filtered.slice(0, MAX_STORES);
    }
  }

  return stores.slice(0, MAX_STORES);
}

// ============================================
// Scoring helpers
// ============================================

function computePriceCompetitiveness(
  products: ProductPrice[],
  cheapestByProduct: Map<string, number>,
): number {
  if (products.length === 0) return 0;

  let totalScore = 0;
  for (const product of products) {
    const cheapest = cheapestByProduct.get(product.catalogProductName);
    if (cheapest === undefined || cheapest === 0) {
      totalScore += 0.5;
      continue;
    }
    // Ratio: cheapest/actual — 1.0 if this IS the cheapest, less if more expensive
    totalScore += Math.min(cheapest / product.price, 1.0);
  }

  return totalScore / products.length;
}

function computeBasketCoverage(products: ProductPrice[]): number {
  let matched = 0;
  for (const basketItem of HABITA_BASE_BASKET) {
    const hasMatch = products.some((p) =>
      matchesBasketItem(p.catalogProductName, basketItem) ||
      matchesBasketItem(p.productDescription, basketItem),
    );
    if (hasMatch) matched++;
  }
  return matched / HABITA_BASE_BASKET.length;
}

// ============================================
// Step 5: Recommendation
// ============================================

function buildRecommendation(
  stores: UnifiedStoreCluster[],
  totalProductsSearched: number,
): { recommendation: string; confidence: ShoppingPlanConfidence; topStore: string | null } {
  if (stores.length === 0) {
    return {
      recommendation: "No se encontraron precios. Intenta actualizar mas tarde.",
      confidence: "low",
      topStore: null,
    };
  }

  const best = stores[0]!;
  const coverageRatio = totalProductsSearched > 0
    ? best.totalProductCount / totalProductsSearched
    : 0;
  const confidence = resolveConfidence(coverageRatio);

  const basketFormatted = `$${best.estimatedBasketCost.toLocaleString("es-AR")}`;

  if (confidence === "low") {
    return {
      recommendation: `Datos limitados. ${best.storeName} tiene ${best.totalProductCount} productos, canasta estimada ${basketFormatted}.`,
      confidence,
      topStore: best.storeName,
    };
  }

  if (stores.length === 1) {
    return {
      recommendation: `${best.storeName}: ${best.totalProductCount} productos en ${best.categoryCoverage} categorias, canasta estimada ${basketFormatted}.`,
      confidence,
      topStore: best.storeName,
    };
  }

  const second = stores[1]!;
  const secondBasketFormatted = `$${second.estimatedBasketCost.toLocaleString("es-AR")}`;
  const scoreDiff = best.score - second.score;

  if (scoreDiff > 0.1) {
    return {
      recommendation: `Mejor opcion: ${best.storeName} (${best.totalProductCount} productos, canasta ${basketFormatted}). Le sigue ${second.storeName} con ${second.totalProductCount} productos (${secondBasketFormatted}).`,
      confidence,
      topStore: best.storeName,
    };
  }

  return {
    recommendation: `${best.storeName} y ${second.storeName} estan muy parejos. ${best.storeName}: ${best.totalProductCount} productos (${basketFormatted}), ${second.storeName}: ${second.totalProductCount} productos (${secondBasketFormatted}).`,
    confidence,
    topStore: best.storeName,
  };
}

function resolveConfidence(coverageRatio: number): ShoppingPlanConfidence {
  if (coverageRatio >= HIGH_CONFIDENCE_THRESHOLD) return "high";
  if (coverageRatio >= MEDIUM_CONFIDENCE_THRESHOLD) return "medium";
  return "low";
}

// ============================================
// Haversine distance
// ============================================

/** Calculate distance between two lat/lng points in kilometers */
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// ============================================
// Empty plan
// ============================================

function emptyPlan(): ShoppingPlan {
  return {
    stores: [],
    recommendation: "No se encontraron precios. Intenta actualizar mas tarde.",
    confidence: "low",
    topStore: null,
    productsNotFound: [],
    totalProductsSearched: 0,
    totalProductsFound: 0,
    lastUpdated: new Date().toISOString(),
  };
}
