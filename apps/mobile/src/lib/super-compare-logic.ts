/**
 * Pure logic for the Súper "Comparar" view: user overrides (product swaps)
 * applied to the API's store carts, and the best-vs-rest savings summary.
 * Duplicated from src/lib/super-compare-logic.ts (web) — packages extraction
 * is a later follow-up.
 */

import type { AlternativeProduct, SearchItem, StoreCart } from "@habita/contracts";

const COMBINING_DIACRITICS = /[\u0300-\u036f]/g;

/** Normalizes a term for case- and accent-insensitive comparison. Duplicated from super-shopping-list-logic.ts. */
function normalizeProductTerm(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(COMBINING_DIACRITICS, "").trim();
}

export type CartProduct = StoreCart["products"][number];
export type AdjustedCartProduct = CartProduct;

export interface AdjustedStoreCart extends Omit<StoreCart, "products"> {
  products: AdjustedCartProduct[];
}

export interface CartOverride {
  type?: "swap";
  alternative?: AlternativeProduct;
}

/** Key for the overrides map: "storeName::searchTerm" */
export function overrideKey(storeName: string, searchTerm: string): string {
  return `${storeName}::${searchTerm}`;
}

/** Apply user overrides (product swaps) to the original API carts. */
export function applyOverrides(
  carts: StoreCart[],
  overrides: Map<string, CartOverride>,
  searchItems: SearchItem[],
): AdjustedStoreCart[] {
  const quantityByTerm = new Map(searchItems.map((item) => [item.term, item.quantity]));

  return carts.map((cart) => {
    const products = cart.products.map((product) => {
      const key = overrideKey(cart.storeName, product.searchTerm);
      const override = overrides.get(key);
      const quantity = quantityByTerm.get(product.searchTerm) ?? product.quantity ?? 1;
      const base: AdjustedCartProduct = { ...product, quantity, lineTotal: product.price * quantity };

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
          alternatives: [
            {
              productName: product.productName,
              price: product.price,
              listPrice: product.listPrice,
              link: product.link,
              imageUrl: product.imageUrl,
              unitInfo: product.unitInfo,
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

/** True when `term` is still missing from `cart`'s products (the "falta {term}" case). */
export function isTermMissing(cart: AdjustedStoreCart, term: string): boolean {
  const normalized = normalizeProductTerm(term);
  return cart.missingTerms.some((missing) => normalizeProductTerm(missing) === normalized);
}

export interface SavingsSummary {
  savingsVsNext: number | null;
  nextStoreName: string | null;
}

/** Savings of the best (first) cart vs. the runner-up, for the winner's banner. */
export function buildSavingsSummary(carts: AdjustedStoreCart[]): SavingsSummary {
  const [winner, runnerUp] = carts;
  if (!winner || !runnerUp) return { savingsVsNext: null, nextStoreName: null };
  return {
    savingsVsNext: Math.round(runnerUp.totalPrice - winner.totalPrice),
    nextStoreName: runnerUp.storeName,
  };
}
