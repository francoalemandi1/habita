/**
 * Shared localStorage helpers for the shopping cart search items.
 * Used by both grocery-advisor (main cart) and grocery-deals (top offers add-to-cart).
 */

import { normalizeProductTerm } from "@/components/features/product-search-input";

import type { SearchItem } from "@/lib/supermarket-search";

// ============================================
// Constants
// ============================================

const SEARCH_ITEMS_KEY = "habita:shopping-search-items";
const TERMS_KEY = "habita:shopping-terms";

// ============================================
// Helpers
// ============================================

function isSearchItem(value: unknown): value is SearchItem {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.term === "string" && typeof candidate.quantity === "number";
}

// ============================================
// Public API
// ============================================

/**
 * Load saved search items from localStorage.
 * Handles legacy format (string[] of terms) gracefully.
 */
export function loadSearchItems(): SearchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEARCH_ITEMS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(isSearchItem)
          .map((item) => ({
            term: item.term.trim(),
            quantity: Math.max(1, Math.floor(item.quantity)),
          }))
          .filter((item) => item.term.length > 0);
      }
    }

    // Legacy fallback: plain string array
    const rawTerms = localStorage.getItem(TERMS_KEY);
    if (!rawTerms) return [];
    const parsed: unknown = JSON.parse(rawTerms);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((term): term is string => typeof term === "string")
        .map((term) => ({ term, quantity: 1 }));
    }
  } catch {
    // Corrupted data — ignore
  }
  return [];
}

/** Persist search items to localStorage. */
export function saveSearchItems(items: SearchItem[]): void {
  try {
    localStorage.setItem(SEARCH_ITEMS_KEY, JSON.stringify(items));
    localStorage.setItem(TERMS_KEY, JSON.stringify(items.map((item) => item.term)));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

/**
 * Add new product terms to the existing cart, deduplicating by normalized term.
 * Returns the number of NEW items actually added.
 */
export function addSearchItems(newTerms: string[]): number {
  const current = loadSearchItems();
  const existingSet = new Set(current.map((item) => normalizeProductTerm(item.term)));
  let added = 0;

  for (const term of newTerms) {
    const trimmed = term.trim();
    if (!trimmed) continue;
    const normalized = normalizeProductTerm(trimmed);
    if (existingSet.has(normalized)) continue;
    existingSet.add(normalized);
    current.push({ term: trimmed, quantity: 1 });
    added++;
  }

  if (added > 0) {
    saveSearchItems(current);
  }
  return added;
}
