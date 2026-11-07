/**
 * MCP tool: compare_cart.
 *
 * Builds a shopping cart across Argentine supermarkets for a list of product
 * terms and returns compact per-store totals, plus server-side (no LLM) bank
 * promo options applied on top of each store's total.
 *
 * Caches the raw compare for 1h, keyed only by items+city — promos are
 * applied fresh on every call so day/paymentMethods never affect the cache key.
 */

import { z } from "zod";

import { compareProducts } from "@/lib/supermarket-search";
import { cacheGet, cacheSet, compareCacheKey, COMPARE_CACHE_TTL_SECONDS } from "../cache";
import { loadPromoCatalog, isPromoExpired, promoAppliesOnDay, matchesAnyPaymentMethod } from "../promo-catalog";
import { WEEKDAYS, getTodayDayNameInBuenosAires } from "../weekday";

import type { NotFoundSuggestion, ShoppingPlanResult } from "@/lib/supermarket-search";
import type { CachedPromo } from "../promo-catalog";
import type { Weekday } from "../weekday";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const MAX_ITEMS = 40;
const MAX_PROMO_OPTIONS_PER_STORE = 3;
/** A cold promoarg fetch measured ~28 s (2026-11-07); never let it hold the cart past this. */
const PROMO_LOAD_DEADLINE_MS = 15_000;
/** Leaves headroom under the route's 60 s maxDuration to return a useful error instead of a timeout. */
const COMPARE_DEADLINE_MS = 50_000;

class DeadlineExceededError extends Error {}

function withDeadline<T>(work: Promise<T>, deadlineMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DeadlineExceededError(`${label} exceeded ${deadlineMs} ms`)), deadlineMs);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

interface LoadedPromos {
  catalog: CachedPromo[];
  promosUnavailable: boolean;
  promosAsOf: string | null;
}

async function loadPromoCatalogWithinDeadline(): Promise<LoadedPromos> {
  try {
    const { promos, fetchedAt } = await withDeadline(loadPromoCatalog(), PROMO_LOAD_DEADLINE_MS, "promo catalog");
    return { catalog: promos, promosUnavailable: false, promosAsOf: fetchedAt };
  } catch (error) {
    console.error("[mcp/compare_cart] Promo catalog unavailable:", error);
    return { catalog: [], promosUnavailable: true, promosAsOf: null };
  }
}

export const compareCartInputSchema = {
  items: z
    .array(
      z.object({
        term: z.string().trim().min(2).max(80).describe("Product search term in Spanish."),
        quantity: z.number().int().min(1).max(99).default(1).describe("How many units to buy."),
      }),
    )
    .min(1)
    .max(MAX_ITEMS)
    .describe(`List of products to compare, 1-${MAX_ITEMS} items.`),
  city: z
    .string()
    .trim()
    .max(60)
    .optional()
    .describe("Argentine city to restrict results to stores with coverage there. Omit to search all stores."),
  paymentMethods: z
    .array(z.string().trim().max(40))
    .min(1)
    .max(10)
    .optional()
    .describe("Bank/wallet names to match promos against (e.g. 'Galicia', 'Mercado Pago', 'MODO', 'Naranja X')."),
  day: z
    .enum(WEEKDAYS)
    .optional()
    .describe("Spanish weekday to filter promos by. Defaults to today in Argentina (America/Argentina/Buenos_Aires)."),
};

// ============================================
// Plain compare (cached)
// ============================================

interface CompactCartProduct {
  term: string;
  productName: string;
  quantity: number;
  price: number;
  lineTotal: number;
  link: string;
  isCheapest: boolean;
}

interface CompactStoreCart {
  storeName: string;
  totalPrice: number;
  foundCount: number;
  totalSearched: number;
  missingTerms: string[];
  products: CompactCartProduct[];
}

interface PlainCompareCartResult {
  storeCarts: CompactStoreCart[];
  notFound: string[];
  /** Near-miss products for notFound terms, to pick one or rephrase the term. */
  suggestions: NotFoundSuggestion[];
  unavailableStores: string[];
  searchedAt: string;
}

function toCompact(result: ShoppingPlanResult): PlainCompareCartResult {
  return {
    storeCarts: result.storeCarts.map((cart) => ({
      storeName: cart.storeName,
      totalPrice: cart.totalPrice,
      foundCount: cart.products.length,
      totalSearched: cart.totalSearched,
      missingTerms: cart.missingTerms,
      products: cart.products.map((product) => ({
        term: product.searchTerm,
        productName: product.productName,
        quantity: product.quantity,
        price: product.price,
        lineTotal: product.lineTotal,
        link: product.link,
        isCheapest: product.isCheapest,
      })),
    })),
    notFound: result.notFound,
    suggestions: result.suggestions ?? [],
    unavailableStores: result.unavailableStores,
    searchedAt: result.searchedAt,
  };
}

async function loadPlainCompare(
  items: Array<{ term: string; quantity: number }>,
  city: string | undefined,
): Promise<PlainCompareCartResult> {
  const cacheKey = compareCacheKey(items, city);

  const cached = await cacheGet<PlainCompareCartResult>(cacheKey);
  if (cached) return cached;

  const result = toCompact(await compareProducts(items, city ?? null));

  if (result.unavailableStores.length === 0) {
    await cacheSet(cacheKey, result, COMPARE_CACHE_TTL_SECONDS);
  }

  return result;
}

// ============================================
// Promo options (server-side, no LLM)
// ============================================

export interface PromoOption {
  bank: string;
  paymentMethods: string[];
  discountPercent: number;
  capAmount: number | null;
  estimatedSavings: number;
  totalWithPromo: number;
}

function buildPromoOptionsForStore(
  storeName: string,
  totalPrice: number,
  catalog: CachedPromo[],
  day: Weekday,
  paymentMethods: string[] | undefined,
  now: Date,
): PromoOption[] {
  const applicable = catalog.filter((promo) => {
    if (promo.storeName !== storeName) return false;
    if (isPromoExpired(promo, now)) return false;
    if (!promoAppliesOnDay(promo, day)) return false;
    if (paymentMethods && paymentMethods.length > 0 && !matchesAnyPaymentMethod(promo, paymentMethods)) return false;
    return true;
  });

  const options: PromoOption[] = applicable.map((promo) => {
    const cap = promo.capAmount ?? Infinity;
    const estimatedSavings = Math.round(Math.min(totalPrice * (promo.discountPercent / 100), cap));
    return {
      bank: promo.bankDisplayName,
      paymentMethods: promo.paymentMethods,
      discountPercent: promo.discountPercent,
      capAmount: promo.capAmount,
      estimatedSavings,
      totalWithPromo: totalPrice - estimatedSavings,
    };
  });

  options.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  return options.slice(0, MAX_PROMO_OPTIONS_PER_STORE);
}

interface StoreCartWithPromos extends CompactStoreCart {
  promoOptions: PromoOption[];
  bestTotal: number;
}

function computeCheapestWithPromos(
  storeCarts: StoreCartWithPromos[],
): { storeName: string; bestTotal: number; bank: string | null } | null {
  const [first, ...rest] = storeCarts;
  if (!first) return null;

  let cheapest = first;
  for (const cart of rest) {
    if (cart.bestTotal < cheapest.bestTotal) cheapest = cart;
  }

  const bank = cheapest.promoOptions.find((option) => option.totalWithPromo === cheapest.bestTotal)?.bank ?? null;
  return { storeName: cheapest.storeName, bestTotal: cheapest.bestTotal, bank };
}

const PROMO_DISCLAIMER =
  "Savings are estimates; promos may require specific card plans, categories or minimum purchase — check sourceUrl.";

export interface CompareCartResult {
  storeCarts: StoreCartWithPromos[];
  notFound: string[];
  suggestions: NotFoundSuggestion[];
  unavailableStores: string[];
  searchedAt: string;
  promosUnavailable: boolean;
  /** When the promo catalog was fetched from promoarg; it may be up to ~6 h old. */
  promosAsOf: string | null;
  cheapestWithPromos: { storeName: string; bestTotal: number; bank: string | null } | null;
  promoDisclaimer: string;
}

export async function runCompareCart(input: {
  items: Array<{ term: string; quantity?: number }>;
  city?: string;
  paymentMethods?: string[];
  day?: Weekday;
}): Promise<CompareCartResult> {
  const items = input.items.map((item) => ({ term: item.term, quantity: item.quantity ?? 1 }));
  // Promos load in parallel with the compare; both are bounded so the tool answers inside maxDuration.
  const [plain, { catalog, promosUnavailable, promosAsOf }] = await Promise.all([
    withDeadline(loadPlainCompare(items, input.city), COMPARE_DEADLINE_MS, "compare"),
    loadPromoCatalogWithinDeadline(),
  ]);

  const day = input.day ?? getTodayDayNameInBuenosAires();
  const now = new Date();

  const storeCarts: StoreCartWithPromos[] = plain.storeCarts.map((cart) => {
    const promoOptions = buildPromoOptionsForStore(
      cart.storeName,
      cart.totalPrice,
      catalog,
      day,
      input.paymentMethods,
      now,
    );
    const bestTotal =
      promoOptions.length > 0 ? Math.min(...promoOptions.map((o) => o.totalWithPromo)) : cart.totalPrice;
    return { ...cart, promoOptions, bestTotal };
  });

  return {
    storeCarts,
    notFound: plain.notFound,
    suggestions: plain.suggestions,
    unavailableStores: plain.unavailableStores,
    searchedAt: plain.searchedAt,
    promosUnavailable,
    promosAsOf,
    cheapestWithPromos: computeCheapestWithPromos(storeCarts),
    promoDisclaimer: PROMO_DISCLAIMER,
  };
}

export async function handleCompareCart(args: {
  items: Array<{ term: string; quantity?: number }>;
  city?: string;
  paymentMethods?: string[];
  day?: Weekday;
}): Promise<CallToolResult> {
  try {
    const result = await runCompareCart(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    console.error("[mcp/compare_cart] Tool failed:", error);
    const message =
      error instanceof DeadlineExceededError
        ? "Supermarkets are responding slowly. Try again with fewer items (e.g. split the list in two)."
        : "Failed to compare cart prices. Please try again.";
    return { content: [{ type: "text", text: message }], isError: true };
  }
}
