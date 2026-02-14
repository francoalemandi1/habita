/**
 * Shopping Plan Types
 *
 * Types for the unified shopping plan that aggregates
 * Precios Claros data across products to recommend
 * WHERE to do weekly shopping.
 */

import type { GroceryCategory } from "@prisma/client";

// ============================================
// Product price (from Precios Claros)
// ============================================

/** A single product's price at a specific store */
export interface ProductPrice {
  /** Name from our ProductCatalog: "Aceite girasol" */
  catalogProductName: string;
  /** EAN barcode from Precios Claros */
  ean: string;
  /** Brand name: "Natura" */
  brand: string;
  /** Full description: "Aceite de Girasol 1,5 lt" */
  productDescription: string;
  /** Store banner: "Carrefour" */
  store: string;
  /** Price in ARS (numeric) */
  price: number;
  /** Store address */
  storeAddress: string;
  /** Store locality */
  storeLocality: string;
  /** Store latitude */
  storeLat: number;
  /** Store longitude */
  storeLng: number;
  /** Product category from catalog */
  category: GroceryCategory;
}

// ============================================
// Store cluster
// ============================================

/** A store cluster that spans multiple categories */
export interface UnifiedStoreCluster {
  storeName: string;
  totalProductCount: number;
  /** Products grouped by category for display */
  productsByCategory: Partial<Record<GroceryCategory, ProductPrice[]>>;
  /** Flat list of all products */
  allProducts: ProductPrice[];
  /** Sum of all found product prices */
  estimatedBasketCost: number;
  /** How many categories this store covers */
  categoryCoverage: number;
  /** How many products this store is cheapest for */
  cheapestProductCount: number;
  /** Unified score (0–1) */
  score: number;
  /** Distance from user in km (null if location unavailable) */
  distanceKm: number | null;
  /** Representative store address */
  storeAddress: string | null;
  /** Representative store locality */
  storeLocality: string | null;
}

// ============================================
// Shopping plan
// ============================================

/** Confidence level for the shopping plan recommendation */
export type ShoppingPlanConfidence = "high" | "medium" | "low";

/** The final unified shopping plan result */
export interface ShoppingPlan {
  /** Stores ranked by unified score */
  stores: UnifiedStoreCluster[];
  /** Human-readable recommendation */
  recommendation: string;
  /** Confidence in the recommendation */
  confidence: ShoppingPlanConfidence;
  /** Best store name */
  topStore: string | null;
  /** Products not found in ANY store */
  productsNotFound: string[];
  /** Total catalog products searched */
  totalProductsSearched: number;
  /** Products found in at least one store */
  totalProductsFound: number;
  /** Timestamp of generation */
  lastUpdated: string;
}
