/**
 * Orchestrates supermarket price comparison across multiple stores.
 *
 * Takes a list of search terms, queries all stores in parallel, picks the best
 * match per term per store (by price/unit), and builds cart-per-store results
 * with alternatives.
 */

import { searchAllStores } from "@/lib/vtex-client";
import { parseProductUnit } from "@/lib/unit-parser";
import { createLimiter } from "@/lib/concurrency";
import { expandTermVariants, tokenMatches } from "@/lib/product-synonyms";

import type { VtexProduct, StoreSearchResult } from "@/lib/vtex-client";
import type { UnitInfo } from "@/lib/unit-parser";
import type { Limiter } from "@/lib/concurrency";

// ============================================
// Types
// ============================================

export type ProductUnitInfo = UnitInfo & { pricePerUnit: number };

export interface AlternativeProduct {
  productName: string;
  price: number;
  listPrice: number | null;
  link: string;
  imageUrl: string | null;
  unitInfo: ProductUnitInfo | null;
}

export interface CartProduct {
  searchTerm: string;
  quantity: number;
  productName: string;
  price: number;
  lineTotal: number;
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

export interface NotFoundSuggestion {
  term: string;
  storeName: string;
  productName: string;
  price: number;
  link: string;
}

export interface ShoppingPlanResult {
  storeCarts: StoreCart[];
  notFound: string[];
  /** Stores that failed every term they were asked about in this call. */
  unavailableStores: string[];
  searchedAt: string;
  /** Near-miss products for notFound terms, below the match threshold. */
  suggestions?: NotFoundSuggestion[];
}

export interface SearchItem {
  term: string;
  quantity: number;
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
  const matchCount = termTokens.filter((token) => tokenMatches(token, normalizedName)).length;
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

export interface TermResult {
  product: VtexProduct;
  unitInfo: ProductUnitInfo | null;
  alternatives: AlternativeProduct[];
}

function normalizeSearchItems(searchInput: string[] | SearchItem[]): SearchItem[] {
  const map = new Map<string, { term: string; quantity: number }>();

  for (const rawItem of searchInput) {
    const term = typeof rawItem === "string" ? rawItem : rawItem.term;
    const quantity = typeof rawItem === "string" ? 1 : rawItem.quantity;
    const trimmedTerm = term.trim();
    if (!trimmedTerm) continue;
    const normalizedKey = normalize(trimmedTerm);
    const safeQuantity = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
    const existing = map.get(normalizedKey);
    if (existing) {
      existing.quantity += safeQuantity;
    } else {
      map.set(normalizedKey, { term: trimmedTerm, quantity: safeQuantity });
    }
  }

  return Array.from(map.values());
}

/**
 * Score, filter, and rank products for a search term.
 * Returns the best product (by price/unit) plus up to 3 alternatives.
 */
export function pickRankedMatches(searchTerm: string, products: VtexProduct[]): TermResult | null {
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
      imageUrl: r.product.imageUrl,
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
  searchItems: SearchItem[],
  storeResults: Map<string, Map<string, TermResult>>,
  promoStores?: Set<string> | null,
): { storeCarts: StoreCart[]; notFound: string[] } {
  const searchTerms = searchItems.map((item) => item.term);
  const quantityByTerm = new Map(searchItems.map((item) => [item.term, item.quantity]));
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
        quantity: quantityByTerm.get(term) ?? 1,
        productName: termResult.product.productName,
        price: termResult.product.price,
        lineTotal: termResult.product.price * (quantityByTerm.get(term) ?? 1),
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

    const totalPrice = products.reduce((sum, product) => sum + product.lineTotal, 0);
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

  // Sort by weighted score: completeness (50%) + price factor (35%) + promo boost (15%)
  const maxPrice = Math.max(...storeCarts.map((c) => c.totalPrice), 1);
  storeCarts.sort((a, b) => {
    const completenessA = a.totalSearched > 0 ? a.products.length / a.totalSearched : 0;
    const completenessB = b.totalSearched > 0 ? b.products.length / b.totalSearched : 0;
    const priceFactorA = 1 - (a.totalPrice / maxPrice);
    const priceFactorB = 1 - (b.totalPrice / maxPrice);
    const promoBoostA = promoStores?.has(a.storeName) ? 1 : 0;
    const promoBoostB = promoStores?.has(b.storeName) ? 1 : 0;
    const scoreA = completenessA * 0.5 + priceFactorA * 0.35 + promoBoostA * 0.15;
    const scoreB = completenessB * 0.5 + priceFactorB * 0.35 + promoBoostB * 0.15;
    return scoreB - scoreA;
  });

  return { storeCarts, notFound };
}

// ============================================
// Near-miss suggestions
// ============================================

const SUGGESTION_SCORE_THRESHOLD = 0.15;
const MAX_SUGGESTIONS_PER_TERM = 3;

function sharesAnyToken(termTokens: string[], product: VtexProduct): boolean {
  const normalizedName = normalize(product.productName);
  return termTokens.some((token) => tokenMatches(token, normalizedName));
}

/**
 * Best below-threshold candidates for a term that matched nothing in any
 * store, so the user gets a hint instead of a bare notFound.
 */
export function buildNotFoundSuggestions(
  term: string,
  candidates: { storeName: string; product: VtexProduct }[],
): NotFoundSuggestion[] {
  const normalizedTerm = normalize(term);
  const termTokens = normalizedTerm.split(/\s+/);

  return candidates
    .map(({ storeName, product }) => ({
      storeName,
      product,
      score: scoreProduct(normalizedTerm, termTokens, product),
    }))
    .filter((c) => c.score >= SUGGESTION_SCORE_THRESHOLD && c.score < MIN_SCORE_THRESHOLD)
    // The length factor alone scores 0.3 x ratio, so without this a product sharing no word
    // with the term would still be "suggested".
    .filter((c) => sharesAnyToken(termTokens, c.product))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUGGESTIONS_PER_TERM)
    .map((c) => ({
      term,
      storeName: c.storeName,
      productName: c.product.productName,
      price: c.product.price,
      link: c.product.link,
    }));
}

function buildSuggestionsForNotFound(
  notFoundTerms: string[],
  resultBatches: { term: string; results: StoreSearchResult[] }[][],
): NotFoundSuggestion[] {
  const notFoundSet = new Set(notFoundTerms);
  const candidatesByTerm = new Map<string, { storeName: string; product: VtexProduct }[]>();

  for (const batch of resultBatches) {
    for (const { term, results } of batch) {
      if (!notFoundSet.has(term)) continue;
      const candidates = candidatesByTerm.get(term) ?? [];
      for (const storeResult of results) {
        if (storeResult.failed) continue;
        for (const product of storeResult.products) {
          candidates.push({ storeName: storeResult.storeName, product });
        }
      }
      candidatesByTerm.set(term, candidates);
    }
  }

  const suggestions: NotFoundSuggestion[] = [];
  for (const term of notFoundTerms) {
    const candidates = candidatesByTerm.get(term);
    if (!candidates) continue;
    suggestions.push(...buildNotFoundSuggestions(term, candidates));
  }
  return suggestions;
}

// ============================================
// Synonym retry
// ============================================

const MAX_SYNONYM_RETRY_TERMS = 10;

function findGloballyNotFoundTerms(
  searchTerms: string[],
  storeResults: Map<string, Map<string, TermResult>>,
): string[] {
  return searchTerms.filter((term) => {
    for (const [, termMap] of storeResults) {
      if (termMap.has(term)) return false;
    }
    return true;
  });
}

/**
 * For terms that matched nothing anywhere, retry once with a synonym variant
 * of the term (e.g. "lavandina" -> "cloro") against every store, then score
 * the results against the ORIGINAL term so matches stay keyed by what the
 * user typed. Bounded to MAX_SYNONYM_RETRY_TERMS terms per call.
 */
async function retryNotFoundWithSynonyms(
  notFoundTerms: string[],
  city: string | null | undefined,
  limiter: Limiter,
  storeResults: Map<string, Map<string, TermResult>>,
): Promise<{ term: string; results: StoreSearchResult[] }[]> {
  const termsToRetry = notFoundTerms
    .map((term) => ({ term, variants: expandTermVariants(term).slice(1) }))
    .filter((entry) => entry.variants.length > 0)
    .slice(0, MAX_SYNONYM_RETRY_TERMS);

  if (termsToRetry.length === 0) return [];

  const retryResults = await Promise.all(
    termsToRetry.map(async ({ term, variants }) => {
      const firstVariant = variants[0];
      if (firstVariant === undefined) return { term, results: [] };
      return { term, results: await searchAllStores(firstVariant, city ?? null, limiter) };
    }),
  );

  for (const { term, results } of retryResults) {
    for (const storeResult of results) {
      if (storeResult.failed || storeResult.products.length === 0) continue;

      const ranked = pickRankedMatches(term, storeResult.products);
      if (!ranked) continue;

      let termMap = storeResults.get(storeResult.storeName);
      if (!termMap) {
        termMap = new Map();
        storeResults.set(storeResult.storeName, termMap);
      }
      if (!termMap.has(term)) {
        termMap.set(term, ranked);
      }
    }
  }

  return retryResults;
}

// ============================================
// Public API
// ============================================

/**
 * Caps simultaneous outbound store fetches across every term in a single
 * compareProducts call. Without this, N terms x 11 stores can fire hundreds
 * of concurrent requests, which triggers store-side rate limiting and blows
 * past the 60s serverless function budget (maxDuration in shopping-plan route).
 */
const MAX_CONCURRENT_STORE_REQUESTS = 8;

/** Search all supermarkets for a list of products and build comparison carts. */
export async function compareProducts(
  searchInput: string[] | SearchItem[],
  city?: string | null,
  promoStores?: Set<string> | null,
): Promise<ShoppingPlanResult> {
  const searchItems = normalizeSearchItems(searchInput);
  const searchTerms = searchItems.map((item) => item.term);
  if (searchTerms.length === 0) {
    return { storeCarts: [], notFound: [], unavailableStores: [], searchedAt: new Date().toISOString() };
  }

  const limiter = createLimiter(MAX_CONCURRENT_STORE_REQUESTS);

  // Search applicable stores for each term in parallel, sharing one limiter
  // so the term x store fan-out across this whole call stays bounded.
  const allResults = await Promise.all(
    searchTerms.map(async (term) => ({
      term,
      results: await searchAllStores(term, city, limiter),
    })),
  );

  // Organize: Map<storeName, Map<searchTerm, TermResult>>
  const storeResults = new Map<string, Map<string, TermResult>>();
  const storeAttempts = new Map<string, number>();
  const storeFailures = new Map<string, number>();

  for (const { term, results } of allResults) {
    for (const storeResult of results) {
      storeAttempts.set(storeResult.storeName, (storeAttempts.get(storeResult.storeName) ?? 0) + 1);

      if (storeResult.failed) {
        storeFailures.set(storeResult.storeName, (storeFailures.get(storeResult.storeName) ?? 0) + 1);
        continue;
      }
      if (storeResult.products.length === 0) continue;

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

  // A store is unavailable only when it failed every term it was asked about,
  // never merely because it had no matching products for some terms.
  const unavailableStores = Array.from(storeAttempts.entries())
    .filter(([storeName, attempts]) => storeFailures.get(storeName) === attempts)
    .map(([storeName]) => storeName);

  const notFoundAfterFirstPass = findGloballyNotFoundTerms(searchTerms, storeResults);
  const retryResults = await retryNotFoundWithSynonyms(notFoundAfterFirstPass, city, limiter, storeResults);

  const { storeCarts, notFound } = buildStoreCarts(searchItems, storeResults, promoStores);
  const suggestions = buildSuggestionsForNotFound(notFound, [allResults, retryResults]);

  return {
    storeCarts,
    notFound,
    unavailableStores,
    searchedAt: new Date().toISOString(),
    ...(suggestions.length > 0 ? { suggestions } : {}),
  };
}
