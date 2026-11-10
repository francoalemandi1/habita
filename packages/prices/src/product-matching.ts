/**
 * Pure product matching, scoring, and cart-building logic for supermarket
 * price comparison. No I/O: orchestration (fetching, retries) lives in
 * `src/lib/supermarket-search.ts`.
 */

import { parseProductUnit } from "@habita/domain/unit-parser";

import { tokenMatches } from "./product-synonyms";

import type { UnitInfo } from "@habita/domain/unit-parser";

// ============================================
// Store-facing structural types
// ============================================

/** VTEX SKU + seller identifying a product line for "open cart" deep links. */
export interface StoreCartRef {
  skuId: string;
  sellerId: string;
}

export interface StoreProduct {
  productName: string;
  price: number;
  listPrice: number | null;
  link: string;
  imageUrl: string | null;
  /** Optional: saved carts and persisted mobile queries predate this field. */
  cartRef?: StoreCartRef | null;
}

export interface StoreSearchOutcome {
  storeName: string;
  failed: boolean;
  products: StoreProduct[];
}

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
  cartRef?: StoreCartRef | null;
}

/**
 * Not exported: `CartProduct` is `super-compare-logic.ts`'s generic
 * `CartProduct<TUnit>` at the package barrel (needed for mobile's
 * `unitInfo: unknown`), which is structurally identical to this shape when
 * defaulted to `ProductUnitInfo | null`.
 */
interface CartProduct {
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
  cartRef?: StoreCartRef | null;
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
export const CATEGORY_MISMATCH_TOKENS = [
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

export const MIN_SCORE_THRESHOLD = 0.35;
const MAX_ALTERNATIVES = 3;

/** Normalize a string for comparison: lowercase, remove accents. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function computeUnitInfo(product: StoreProduct): ProductUnitInfo | null {
  const parsed = parseProductUnit(product.productName);
  if (!parsed) return null;
  return { ...parsed, pricePerUnit: product.price / parsed.quantity };
}

/** Score a product against a search term. Higher = better match. */
export function scoreProduct(normalizedTerm: string, termTokens: string[], product: StoreProduct): number {
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
  product: StoreProduct;
  score: number;
  unitInfo: ProductUnitInfo | null;
  isHeadMatch: boolean;
}

/**
 * Spanish product names lead with the noun: "Leche entera" is milk, while
 * "Flan dulce de leche" only mentions it. Without this, the cheapest product
 * that merely contains the word wins.
 */
export function startsWithTerm(termTokens: string[], product: StoreProduct): boolean {
  const firstTermToken = termTokens[0];
  const firstNameWord = normalize(product.productName).split(/\s+/)[0];
  if (!firstTermToken || !firstNameWord) return false;
  return tokenMatches(firstTermToken, firstNameWord);
}

export interface TermResult {
  product: StoreProduct;
  unitInfo: ProductUnitInfo | null;
  alternatives: AlternativeProduct[];
}

export function normalizeSearchItems(searchInput: string[] | SearchItem[]): SearchItem[] {
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
export function pickRankedMatches(searchTerm: string, products: StoreProduct[]): TermResult | null {
  if (products.length === 0) return null;

  const normalizedTerm = normalize(searchTerm);
  const termTokens = normalizedTerm.split(/\s+/);

  // Score and filter
  const scored: RankedMatch[] = products
    .map((product) => ({
      product,
      score: scoreProduct(normalizedTerm, termTokens, product),
      unitInfo: computeUnitInfo(product),
      isHeadMatch: startsWithTerm(termTokens, product),
    }))
    .filter((r) => r.score >= MIN_SCORE_THRESHOLD);

  if (scored.length === 0) return null;

  // If the search term itself includes a unit ("queso cremoso 200g"),
  // sort by price-per-unit (best value). Otherwise sort by absolute price.
  const searchTermHasUnit = parseProductUnit(searchTerm) !== null;

  scored.sort((a, b) => {
    if (a.isHeadMatch !== b.isHeadMatch) return a.isHeadMatch ? -1 : 1;
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
      cartRef: r.product.cartRef ?? null,
    }));

  return {
    product: primary.product,
    unitInfo: primary.unitInfo,
    alternatives,
  };
}

// ============================================
// Scoped query ranking (manual "replace product" search)
// ============================================

function tokenizeQuery(value: string): string[] {
  return normalize(value).split(/\s+/).filter(Boolean);
}

/** Score a product name against a free-text query: exact > startsWith > includes > token overlap. */
function scoreQueryMatch(productName: string, query: string): number {
  const normalizedName = normalize(productName);
  const normalizedQuery = normalize(query);
  const queryTokens = tokenizeQuery(query);
  const nameTokens = tokenizeQuery(productName);

  let score = 0;
  if (normalizedName === normalizedQuery) score += 1000;
  if (normalizedName.startsWith(normalizedQuery)) score += 400;
  if (normalizedName.includes(normalizedQuery)) score += 250;

  const tokenMatchCount = queryTokens.filter((token) => normalizedName.includes(token)).length;
  if (queryTokens.length > 0) {
    score += (tokenMatchCount / queryTokens.length) * 200;
  }

  score -= Math.abs(nameTokens.length - queryTokens.length) * 3;
  return score;
}

/**
 * Rank products against a free-text query for the manual "replace product"
 * search: score desc, then price asc. Used by the alternatives route.
 */
export function rankProductsForQuery(query: string, products: StoreProduct[], limit: number): AlternativeProduct[] {
  return products
    .map((product) => ({ product, score: scoreQueryMatch(product.productName, query) }))
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.product.price - b.product.price;
    })
    .slice(0, limit)
    .map(({ product }) => ({
      productName: product.productName,
      price: product.price,
      listPrice: product.listPrice,
      link: product.link,
      imageUrl: product.imageUrl,
      unitInfo: computeUnitInfo(product),
      cartRef: product.cartRef ?? null,
    }));
}

// ============================================
// Cart builder
// ============================================

/** Build shopping carts per store from search results. */
export function buildStoreCarts(
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
        cartRef: termResult.product.cartRef ?? null,
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

export function sharesAnyToken(termTokens: string[], product: StoreProduct): boolean {
  const normalizedName = normalize(product.productName);
  return termTokens.some((token) => tokenMatches(token, normalizedName));
}

/**
 * Best below-threshold candidates for a term that matched nothing in any
 * store, so the user gets a hint instead of a bare notFound.
 */
export function buildNotFoundSuggestions(
  term: string,
  candidates: { storeName: string; product: StoreProduct }[],
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

export function buildSuggestionsForNotFound(
  notFoundTerms: string[],
  resultBatches: { term: string; results: StoreSearchOutcome[] }[][],
): NotFoundSuggestion[] {
  const notFoundSet = new Set(notFoundTerms);
  const candidatesByTerm = new Map<string, { storeName: string; product: StoreProduct }[]>();

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

export function findGloballyNotFoundTerms(
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
