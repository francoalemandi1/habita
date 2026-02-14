/**
 * Habita Base Basket
 *
 * 11 representative recurring household items used to evaluate
 * store coverage. The basket is internal infrastructure — never
 * exposed to the UI. Each item has keywords for simple substring
 * matching against extracted product names.
 *
 * Only includes products available in Precios Claros (packaged goods).
 * Fresh produce, eggs, and fresh cheese are excluded.
 */

// ============================================
// Types
// ============================================

export interface BasketItem {
  /** Canonical name (e.g. "Leche 1L") */
  name: string;
  /**
   * Matching groups for substring matching against productName.
   * Each group is an array of keywords that ALL must match (AND).
   * Multiple groups are evaluated with OR — if ANY group matches, the item matches.
   */
  keywordGroups: string[][];
  /** Relative importance weight — higher means more essential */
  weight: number;
}

// ============================================
// Base Basket (11 items — packaged goods only)
// ============================================

export const HABITA_BASE_BASKET: readonly BasketItem[] = [
  // Dairy (packaged)
  { name: "Leche 1L", keywordGroups: [["leche"]], weight: 3 },

  // Pantry staples
  { name: "Arroz 1kg", keywordGroups: [["arroz"]], weight: 2 },
  { name: "Aceite 1.5L", keywordGroups: [["aceite"]], weight: 3 },
  { name: "Harina 1kg", keywordGroups: [["harina"]], weight: 2 },
  { name: "Azúcar 1kg", keywordGroups: [["azúcar"], ["azucar"]], weight: 2 },
  { name: "Fideos 500g", keywordGroups: [["fideos"], ["fideo"]], weight: 2 },
  { name: "Yerba 1kg", keywordGroups: [["yerba"]], weight: 3 },
  { name: "Pan lactal", keywordGroups: [["pan lactal"], ["pan de molde"]], weight: 2 },

  // Cleaning & hygiene
  { name: "Detergente", keywordGroups: [["detergente"]], weight: 2 },
  { name: "Papel higiénico", keywordGroups: [["papel higiénico"], ["papel higienico"], ["papel hig"]], weight: 2 },

  // Beverages
  { name: "Agua 1.5L", keywordGroups: [["agua mineral"], ["agua villavicencio"], ["agua glaciar"]], weight: 1 },
] as const;

// ============================================
// Matcher helper
// ============================================

/**
 * Check if a product name matches a basket item.
 * Each keyword group is AND (all keywords must match).
 * Multiple groups are OR (any group matching is enough).
 */
export function matchesBasketItem(
  productName: string,
  basketItem: BasketItem
): boolean {
  const lower = productName.toLowerCase();
  return basketItem.keywordGroups.some((group) =>
    group.every((kw) => lower.includes(kw))
  );
}
