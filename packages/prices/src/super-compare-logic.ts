/**
 * Pure logic for the Súper "Comparar" view: user overrides (product swaps)
 * applied to the API's store carts, and the best-vs-rest savings summary.
 *
 * Generic over `TUnit` (the shape of `unitInfo`) because this logic never
 * reads `unitInfo`, only copies it: web passes the precise `ProductUnitInfo
 * | null` from `@habita/prices`'s own matching types, while mobile passes
 * `unknown` from `@habita/contracts`'s zod-validated API shape.
 */

import { discountedPrice, getLocalDayName, isPromoExpired, promoAppliesOnDay } from "./promo-math";
import { normalizeProductTerm } from "./product-term";

import type { PromoLike } from "./promo-math";
import type { ProductUnitInfo, SearchItem, StoreCartRef } from "./product-matching";

export interface CompareAlternative<TUnit = ProductUnitInfo | null> {
  productName: string;
  price: number;
  listPrice: number | null;
  link: string;
  imageUrl: string | null;
  unitInfo?: TUnit;
  cartRef?: StoreCartRef | null;
}

export interface CompareProduct<TUnit = ProductUnitInfo | null> {
  searchTerm: string;
  quantity: number;
  productName: string;
  price: number;
  lineTotal: number;
  listPrice: number | null;
  imageUrl: string | null;
  link: string;
  isCheapest: boolean;
  unitInfo?: TUnit;
  alternatives: CompareAlternative<TUnit>[];
  averagePrice: number | null;
  cartRef?: StoreCartRef | null;
}

export interface CompareCart<TUnit = ProductUnitInfo | null> {
  storeName: string;
  products: CompareProduct<TUnit>[];
  totalPrice: number;
  cheapestCount: number;
  missingTerms: string[];
  totalSearched: number;
}

export type CartProduct<TUnit = ProductUnitInfo | null> = CompareProduct<TUnit>;
export type AdjustedCartProduct<TUnit = ProductUnitInfo | null> = CartProduct<TUnit>;

export interface AdjustedStoreCart<TUnit = ProductUnitInfo | null> extends Omit<CompareCart<TUnit>, "products"> {
  products: AdjustedCartProduct<TUnit>[];
}

export interface CartOverride<TUnit = ProductUnitInfo | null> {
  type?: "swap";
  alternative?: CompareAlternative<TUnit>;
}

/** Key for the overrides map: "storeName::searchTerm" */
export function overrideKey(storeName: string, searchTerm: string): string {
  return `${storeName}::${searchTerm}`;
}

/** Apply user overrides (product swaps) to the original API carts. */
export function applyOverrides<TUnit = ProductUnitInfo | null>(
  carts: CompareCart<TUnit>[],
  overrides: Map<string, CartOverride<TUnit>>,
  searchItems: SearchItem[],
): AdjustedStoreCart<TUnit>[] {
  const quantityByTerm = new Map(searchItems.map((item) => [item.term, item.quantity]));

  return carts.map((cart) => {
    const products = cart.products.map((product) => {
      const key = overrideKey(cart.storeName, product.searchTerm);
      const override = overrides.get(key);
      const quantity = quantityByTerm.get(product.searchTerm) ?? product.quantity ?? 1;
      const base: AdjustedCartProduct<TUnit> = { ...product, quantity, lineTotal: product.price * quantity };

      if (override?.type === "swap" && override.alternative) {
        const alt = override.alternative;
        return {
          ...base,
          productName: alt.productName,
          price: alt.price,
          lineTotal: alt.price * quantity,
          listPrice: alt.listPrice,
          imageUrl: alt.imageUrl,
          link: alt.link,
          unitInfo: alt.unitInfo,
          cartRef: alt.cartRef ?? null,
          alternatives: [
            {
              productName: product.productName,
              price: product.price,
              listPrice: product.listPrice,
              link: product.link,
              imageUrl: product.imageUrl,
              unitInfo: product.unitInfo,
              cartRef: product.cartRef,
            },
            ...product.alternatives.filter((a) => a.link !== alt.link),
          ],
        };
      }

      return base;
    });

    const totalPrice = products.reduce((sum, product) => sum + product.lineTotal, 0);
    const cheapestCount = products.filter((product) => product.isCheapest).length;
    return { ...cart, products, totalPrice, cheapestCount };
  });
}

export interface SavingsSummary {
  savingsVsNext: number | null;
  nextStoreName: string | null;
}

/** Savings of the best (first) cart vs. the runner-up, for the winner's banner. */
export function buildSavingsSummary<TUnit = ProductUnitInfo | null>(carts: AdjustedStoreCart<TUnit>[]): SavingsSummary {
  const [winner, runnerUp] = carts;
  if (!winner || !runnerUp) return { savingsVsNext: null, nextStoreName: null };
  return {
    savingsVsNext: Math.round(runnerUp.totalPrice - winner.totalPrice),
    nextStoreName: runnerUp.storeName,
  };
}

/** True when `term` is still missing from `cart`'s products (the "falta {term}" case). */
export function isTermMissing<TUnit = ProductUnitInfo | null>(cart: AdjustedStoreCart<TUnit>, term: string): boolean {
  const normalized = normalizeProductTerm(term);
  return cart.missingTerms.some((missing) => normalizeProductTerm(missing) === normalized);
}

export interface TodaysPromoPick {
  storeName: string;
  bankDisplayName: string;
  bankSlug: string;
  discountPercent: number;
  capAmount: number | null;
  discountedTotal: number;
}

/** Best promo per store, from preferred banks only, active today and not expired. */
export function pickTodaysPromos<T extends PromoLike & { storeName: string; bankSlug: string; bankDisplayName: string }>(
  carts: { storeName: string; totalPrice: number }[],
  promos: T[],
  preferredBankSlugs: string[],
  now: Date,
): Map<string, TodaysPromoPick> {
  const picks = new Map<string, TodaysPromoPick>();
  if (preferredBankSlugs.length === 0) return picks;

  const todayName = getLocalDayName(now);
  const totalByStore = new Map(carts.map((cart) => [cart.storeName, cart.totalPrice]));

  for (const promo of promos) {
    const totalPrice = totalByStore.get(promo.storeName);
    if (totalPrice === undefined) continue;
    if (!preferredBankSlugs.includes(promo.bankSlug)) continue;
    if (isPromoExpired(promo, now)) continue;
    if (!promoAppliesOnDay(promo, todayName)) continue;

    const total = discountedPrice(totalPrice, promo.discountPercent, promo.capAmount);
    const existing = picks.get(promo.storeName);
    if (existing && existing.discountedTotal <= total) continue;

    picks.set(promo.storeName, {
      storeName: promo.storeName,
      bankDisplayName: promo.bankDisplayName,
      bankSlug: promo.bankSlug,
      discountPercent: promo.discountPercent,
      capAmount: promo.capAmount,
      discountedTotal: total,
    });
  }

  return picks;
}

/** Best (lowest discounted total) pick across all stores, for the top promo banner. */
export function pickBestPromoOverall(picks: Map<string, TodaysPromoPick>): TodaysPromoPick | null {
  let best: TodaysPromoPick | null = null;
  for (const pick of picks.values()) {
    if (!best || pick.discountedTotal < best.discountedTotal) best = pick;
  }
  return best;
}
