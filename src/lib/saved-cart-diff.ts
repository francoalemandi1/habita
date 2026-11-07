/**
 * Computes price differences between a saved cart's stored products and a
 * freshly re-searched cart for the same store, for the refresh route.
 */

import { z } from "zod";
import { cartProductSchema } from "@habita/contracts";

import type { CartProduct } from "@/lib/supermarket-search";

export interface PriceChange {
  term: string;
  productName: string;
  previousPrice: number;
  currentPrice: number;
}

const savedProductsSchema = z.array(cartProductSchema);

/**
 * Compares the cart's previously stored `products` JSON against the fresh
 * cart's products and returns only the terms whose price changed.
 * Invalid or legacy-shaped stored JSON yields no changes rather than throwing.
 */
export function diffCartPrices(storedProductsJson: unknown, freshProducts: CartProduct[]): PriceChange[] {
  const parsed = savedProductsSchema.safeParse(storedProductsJson);
  if (!parsed.success) return [];

  const previousByTerm = new Map(parsed.data.map((product) => [product.searchTerm, product]));

  const changes: PriceChange[] = [];
  for (const fresh of freshProducts) {
    const previous = previousByTerm.get(fresh.searchTerm);
    if (!previous) continue;
    if (Math.abs(previous.price - fresh.price) < 0.01) continue;

    changes.push({
      term: fresh.searchTerm,
      productName: fresh.productName,
      previousPrice: previous.price,
      currentPrice: fresh.price,
    });
  }

  return changes;
}
