/**
 * Pure logic for the Súper "Comparar" view: user overrides (product swaps)
 * applied to the API's store carts, and the best-vs-rest savings summary.
 *
 * Generic over `TUnit` (the shape of `unitInfo`) because this logic never
 * reads `unitInfo`, only copies it: web passes the precise `ProductUnitInfo
 * | null` from `@habita/prices`'s own matching types, while mobile passes
 * `unknown` from `@habita/contracts`'s zod-validated API shape.
 */

import { normalizeProductTerm } from "./product-term";

import type { ProductUnitInfo, SearchItem } from "./product-matching";

export interface CompareAlternative<TUnit = ProductUnitInfo | null> {
  productName: string;
  price: number;
  listPrice: number | null;
  link: string;
  imageUrl: string | null;
  unitInfo?: TUnit;
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
