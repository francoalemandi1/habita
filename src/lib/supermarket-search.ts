/**
 * Orchestrates supermarket price comparison across multiple stores.
 *
 * Takes a list of search terms, queries all stores in parallel, picks the best
 * match per term per store (by price/unit), and builds cart-per-store results
 * with alternatives.
 */

import { searchAllStores } from "@/lib/vtex-client";
import { parseProductUnit } from "@/lib/unit-parser";

import type { VtexProduct } from "@/lib/vtex-client";
import type { UnitInfo } from "@/lib/unit-parser";

// ============================================
// Types
// ============================================

export type ProductUnitInfo = UnitInfo & { pricePerUnit: number };

export interface AlternativeProduct {
  productName: string;
  price: number;
  listPrice: number | null;
  link: string;
  unitInfo: ProductUnitInfo | null;
}

export interface CartProduct {
  searchTerm: string;
  productName: string;
  price: number;
  listPrice: number | null;
  imageUrl: string | null;
  link: string;
  isCheapest: boolean;
  unitInfo: ProductUnitInfo | null;
  alternatives: AlternativeProduct[];
  /** Average price across all stores for this term (null if only 1 store has it). */
  averagePrice: number | null;
}

export interface StoreCart {
  storeName: string;
  products: CartProduct[];
  totalPrice: number;
  cheapestCount: number;
  /** Search terms this store did NOT find (excludes globally not-found terms). */
  missingTerms: string[];
  /** Total searchable terms (excludes terms not found in any store). */
  totalSearched: number;
}

export interface ShoppingPlanResult {
  storeCarts: StoreCart[];
  notFound: string[];
  searchedAt: string;
}

// ============================================
// Category mismatch blocklist
// ============================================

/**
 * Tokens that indicate a category mismatch. If a product name contains
 * any of these but the search term does NOT, the score is penalized.
 */
const CATEGORY_MISMATCH_TOKENS = [
  // Sauces / condiments (not the raw ingredient)
  "mayonesa", "ketchup", "mostaza", "aderezo",
  // Pet food
  "whiskas", "pedigree", "purina", "friskies",
  "perro", "gato", "mascota", "gatito", "canino",
  // Cleaning
  "limpiador", "desinfectante", "detergente", "lavandina",
  "suavizante", "quitamanchas",
  // Personal care
  "shampoo", "acondicionador", "desodorante", "crema dental",
  // Processed variants that differ from raw ingredient
  "mate cocido", "infusion", "saquito",
  // Supplements
  "suplemento", "vitamina", "proteina",
];

const MISMATCH_PENALTY = 0.5;

// ============================================
// Fuzzy matching
// ============================================

const MIN_SCORE_THRESHOLD = 0.35;
const MAX_ALTERNATIVES = 3;

/** Normalize a string for comparison: lowercase, remove accents. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function computeUnitInfo(product: VtexProduct): ProductUnitInfo | null {
  const parsed = parseProductUnit(product.productName);
  if (!parsed) return null;
  return { ...parsed, pricePerUnit: product.price / parsed.quantity };
}

/** Score a product against a search term. Higher = better match. */
function scoreProduct(normalizedTerm: string, termTokens: string[], product: VtexProduct): number {
  const normalizedName = normalize(product.productName);

  // Token overlap: how many search tokens appear in the product name
  const matchCount = termTokens.filter((token) => normalizedName.includes(token)).length;
  const tokenMatchRatio = matchCount / termTokens.length;

  // Length penalty: avoid overly specific matches
  const nameTokens = normalizedName.split(/\s+/).length;
  const lengthRatio = Math.min(1, termTokens.length / nameTokens);

  let score = tokenMatchRatio * 0.7 + lengthRatio * 0.3;

  // Category mismatch penalty
  for (const mismatchToken of CATEGORY_MISMATCH_TOKENS) {
    if (normalizedName.includes(mismatchToken) && !normalizedTerm.includes(mismatchToken)) {
      score *= 1 - MISMATCH_PENALTY;
      break;
    }
  }

  return score;
}

// ============================================
// Ranked matching
// ============================================

interface RankedMatch {
  product: VtexProduct;
  score: number;
  unitInfo: ProductUnitInfo | null;
}

interface TermResult {
  product: VtexProduct;
  unitInfo: ProductUnitInfo | null;
  alternatives: AlternativeProduct[];
}

/**
 * Score, filter, and rank products for a search term.
 * Returns the best product (by price/unit) plus up to 3 alternatives.
 */
function pickRankedMatches(searchTerm: string, products: VtexProduct[]): TermResult | null {
  if (products.length === 0) return null;

  const normalizedTerm = normalize(searchTerm);
  const termTokens = normalizedTerm.split(/\s+/);

  // Score and filter
  const scored: RankedMatch[] = products
    .map((product) => ({
      product,
      score: scoreProduct(normalizedTerm, termTokens, product),
      unitInfo: computeUnitInfo(product),
    }))
    .filter((r) => r.score >= MIN_SCORE_THRESHOLD);

  if (scored.length === 0) return null;

  // If the search term itself includes a unit ("queso cremoso 200g"),
  // sort by price-per-unit (best value). Otherwise sort by absolute price.
  const searchTermHasUnit = parseProductUnit(searchTerm) !== null;

  scored.sort((a, b) => {
    if (searchTermHasUnit) {
      const anyHasUnit = scored.some((r) => r.unitInfo !== null);
      if (anyHasUnit) {
        const aValue = a.unitInfo?.pricePerUnit ?? Infinity;
        const bValue = b.unitInfo?.pricePerUnit ?? Infinity;
        if (aValue !== bValue) return aValue - bValue;
      }
    }
    return a.product.price - b.product.price;
  });

  const primary = scored[0]!;

  const alternatives: AlternativeProduct[] = scored
    .slice(1, 1 + MAX_ALTERNATIVES)
    .map((r) => ({
      productName: r.product.productName,
      price: r.product.price,
      listPrice: r.product.listPrice,
      link: r.product.link,
      unitInfo: r.unitInfo,
    }));

  return {
    product: primary.product,
    unitInfo: primary.unitInfo,
    alternatives,
  };
}

// ============================================
// Cart builder
// ============================================

/** Build shopping carts per store from search results. */
function buildStoreCarts(
  searchTerms: string[],
  storeResults: Map<string, Map<string, TermResult>>,
): { storeCarts: StoreCart[]; notFound: string[] } {
  // Find cheapest and average price per search term across all stores
  const cheapestPriceByTerm = new Map<string, number>();
  const averagePriceByTerm = new Map<string, number>();

  for (const term of searchTerms) {
    let minPrice = Infinity;
    let priceSum = 0;
    let storeCount = 0;

    for (const [, termMap] of storeResults) {
      const result = termMap.get(term);
      if (result) {
        if (result.product.price < minPrice) minPrice = result.product.price;
        priceSum += result.product.price;
        storeCount++;
      }
    }

    if (minPrice < Infinity) {
      cheapestPriceByTerm.set(term, minPrice);
    }
    if (storeCount > 1) {
      averagePriceByTerm.set(term, priceSum / storeCount);
    }
  }

  // Terms not found in any store
  const notFound = searchTerms.filter((term) => !cheapestPriceByTerm.has(term));

  // Terms that exist in at least one store (excludes globally not-found)
  const searchableTerms = searchTerms.filter((t) => cheapestPriceByTerm.has(t));

  // Build cart per store
  const storeCarts: StoreCart[] = [];

  for (const [storeName, termMap] of storeResults) {
    const products: CartProduct[] = [];

    for (const term of searchTerms) {
      const termResult = termMap.get(term);
      if (!termResult) continue;

      const cheapest = cheapestPriceByTerm.get(term) ?? termResult.product.price;

      products.push({
        searchTerm: term,
        productName: termResult.product.productName,
        price: termResult.product.price,
        listPrice: termResult.product.listPrice,
        imageUrl: termResult.product.imageUrl,
        link: termResult.product.link,
        isCheapest: Math.abs(termResult.product.price - cheapest) < 0.01,
        unitInfo: termResult.unitInfo,
        alternatives: termResult.alternatives,
        averagePrice: averagePriceByTerm.get(term) ?? null,
      });
    }

    if (products.length === 0) continue;

    const foundTerms = new Set(products.map((p) => p.searchTerm));
    const missingTerms = searchableTerms.filter((t) => !foundTerms.has(t));

    const totalPrice = products.reduce((sum, p) => sum + p.price, 0);
    const cheapestCount = products.filter((p) => p.isCheapest).length;

    storeCarts.push({
      storeName,
      products,
      totalPrice,
      cheapestCount,
      missingTerms,
      totalSearched: searchableTerms.length,
    });
  }

  // Sort by completeness (more products first), then by total price
  storeCarts.sort((a, b) => {
    const completenessA = a.totalSearched > 0 ? a.products.length / a.totalSearched : 0;
    const completenessB = b.totalSearched > 0 ? b.products.length / b.totalSearched : 0;

    if (completenessA !== completenessB) return completenessB - completenessA;

    return a.totalPrice - b.totalPrice;
  });

  return { storeCarts, notFound };
}

// ============================================
// Public API
// ============================================

/** Search all supermarkets for a list of products and build comparison carts. */
export async function compareProducts(searchTerms: string[], city?: string | null): Promise<ShoppingPlanResult> {
  // Search applicable stores for each term in parallel
  const allResults = await Promise.all(
    searchTerms.map(async (term) => ({
      term,
      results: await searchAllStores(term, city),
    })),
  );

  // Organize: Map<storeName, Map<searchTerm, TermResult>>
  const storeResults = new Map<string, Map<string, TermResult>>();

  for (const { term, results } of allResults) {
    for (const storeResult of results) {
      if (storeResult.failed || storeResult.products.length === 0) continue;

      const ranked = pickRankedMatches(term, storeResult.products);
      if (!ranked) continue;

      let termMap = storeResults.get(storeResult.storeName);
      if (!termMap) {
        termMap = new Map();
        storeResults.set(storeResult.storeName, termMap);
      }

      termMap.set(term, ranked);
    }
  }

  const { storeCarts, notFound } = buildStoreCarts(searchTerms, storeResults);

  return {
    storeCarts,
    notFound,
    searchedAt: new Date().toISOString(),
  };
}
