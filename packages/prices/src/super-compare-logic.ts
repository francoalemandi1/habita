/**
 * Pure logic for the Súper "Comparar" view: user overrides (product swaps)
 * applied to the API's store carts, and the best-vs-rest savings summary.
 *
 * Generic over `TUnit` (the shape of `unitInfo`) because this logic never
 * reads `unitInfo`, only copies it: web passes the precise `ProductUnitInfo
 * | null` from `@habita/prices`'s own matching types, while mobile passes
 * `unknown` from `@habita/contracts`'s zod-validated API shape.
 */

import { packsToBuy } from "./product-matching";
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
  /** The requested unit quantity before pack rounding (e.g. 12 for "Huevos ×12" against a 6-pack). */
  requestedQuantity?: number;
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

function asPositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.max(1, Math.floor(value));
}

/**
 * The requested unit quantity for a persisted cart product: `requestedQuantity`
 * on packs-aware carts, or `quantity` on legacy carts (which stored list units
 * there before packs existed). Falls back to 1 for garbage input.
 */
export function resolveRequestedQuantity(product: Record<string, unknown>): number {
  return asPositiveInt(product.requestedQuantity) ?? asPositiveInt(product.quantity) ?? 1;
}

/**
 * Quantity label for a cart product row: packs bought plus the requested
 * unit count when they differ ("×2 · 12 u."), or just the pack count
 * otherwise. Empty for a single unit with no difference.
 */
export function formatCartQuantity(product: { quantity: number; requestedQuantity?: number }): string {
  if (product.requestedQuantity !== undefined && product.requestedQuantity !== product.quantity) {
    return `×${product.quantity} · ${product.requestedQuantity} u.`;
  }
  return product.quantity > 1 ? `×${product.quantity}` : "";
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
      // Fall back to the stored requested units, never to `quantity` alone: on packs-aware carts that is packs.
      const requestedQuantity = quantityByTerm.get(product.searchTerm) ?? product.requestedQuantity ?? product.quantity ?? 1;
      const basePacks = packsToBuy(requestedQuantity, product.productName);
      const base: AdjustedCartProduct<TUnit> = {
        ...product,
        requestedQuantity,
        quantity: basePacks,
        lineTotal: product.price * basePacks,
      };

      if (override?.type === "swap" && override.alternative) {
        const alt = override.alternative;
        const altPacks = packsToBuy(requestedQuantity, alt.productName);
        return {
          ...base,
          productName: alt.productName,
          price: alt.price,
          quantity: altPacks,
          lineTotal: alt.price * altPacks,
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
