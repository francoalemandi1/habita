/**
 * Pure logic for the Súper "Lista" view (handoff §5.3, §7 pattern A).
 */

import { normalizeProductTerm } from "./product-term";

import type { ShoppingListItem, TopDealProduct } from "@habita/contracts";
import type { SearchItem } from "./product-matching";

/**
 * Orders items the same way the server does: unchecked first (oldest first),
 * then checked items (oldest checked first) at the end. Used to re-sort the
 * client cache after an optimistic toggle, without waiting for a refetch.
 */
export function sortShoppingListItems(items: ShoppingListItem[]): ShoppingListItem[] {
  return [...items].sort((a, b) => {
    const aChecked = a.checkedAt !== null;
    const bChecked = b.checkedAt !== null;
    if (aChecked !== bChecked) return aChecked ? 1 : -1;
    if (!aChecked) return a.createdAt.localeCompare(b.createdAt);
    return (a.checkedAt ?? "").localeCompare(b.checkedAt ?? "");
  });
}

export interface ShoppingListSections {
  pending: ShoppingListItem[];
  inCart: ShoppingListItem[];
}

/**
 * Splits the list into what's still missing and what's already in the cart.
 * Items in `settlingIds` were just checked: they stay in pending, in place, so the
 * check is visible before the row moves to the cart. Ties break on id so a row's place
 * never depends on the cache order (seeded items often share a createdAt).
 */
export function splitShoppingListItems(
  items: ShoppingListItem[],
  settlingIds: ReadonlySet<string>,
): ShoppingListSections {
  const pending = items
    .filter((item) => item.checkedAt === null || settlingIds.has(item.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const inCart = items
    .filter((item) => item.checkedAt !== null && !settlingIds.has(item.id))
    .sort((a, b) => (b.checkedAt ?? "").localeCompare(a.checkedAt ?? "") || a.id.localeCompare(b.id));
  return { pending, inCart };
}

/** Unchecked item count — drives the "Comparar precios · N" CTA label. */
export function countUnchecked(items: ShoppingListItem[]): number {
  return items.filter((item) => item.checkedAt === null).length;
}

/** Builds the compare-price search input from the list's unchecked items. */
export function buildCompareSearchItems(items: ShoppingListItem[]): SearchItem[] {
  return items
    .filter((item) => item.checkedAt === null)
    .map((item) => ({ term: item.name, quantity: Math.min(99, Math.max(1, item.quantity)) }));
}

/**
 * Best-effort match between a list item's name and the current top deals,
 * for the Manteca "oferta" tag. Normalized substring match in either direction.
 */
export function matchesTopDeal(itemName: string, topDeals: TopDealProduct[]): boolean {
  const normalizedName = normalizeProductTerm(itemName);
  if (!normalizedName) return false;
  return topDeals.some((deal) => {
    const normalizedDeal = normalizeProductTerm(deal.productName);
    return normalizedDeal.includes(normalizedName) || normalizedName.includes(normalizedDeal);
  });
}

/** True when `dealName` already matches an unchecked item on the list — drives "En tu lista". */
export function isDealInList(dealName: string, items: ShoppingListItem[]): boolean {
  const normalizedDeal = normalizeProductTerm(dealName);
  return items.some((item) => item.checkedAt === null && normalizeProductTerm(item.name) === normalizedDeal);
}
