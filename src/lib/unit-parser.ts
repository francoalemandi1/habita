/**
 * Extracts weight or volume from product names.
 *
 * Parses patterns like "1.5 L", "500 Gr", "1kg", "250 cc" and normalizes
 * to grams or milliliters for price-per-unit comparison.
 */

// ============================================
// Types
// ============================================

export interface UnitInfo {
  /** Quantity in base unit (grams or milliliters). */
  quantity: number;
  /** Base unit type. */
  unit: "g" | "ml";
  /** Human-readable label (e.g. "1.5L", "500g"). */
  unitLabel: string;
}

// ============================================
// Patterns
// ============================================

interface UnitPattern {
  regex: RegExp;
  toBase: (quantity: number) => number;
  unit: "g" | "ml";
  formatLabel: (quantity: number) => string;
}

/**
 * Ordered from most specific to least specific.
 * First match wins — kg before g, liters before ml.
 */
const UNIT_PATTERNS: UnitPattern[] = [
  // Kilograms → grams
  {
    regex: /(\d+(?:[.,]\d+)?)\s*kg\b/i,
    toBase: (q) => q * 1000,
    unit: "g",
    formatLabel: (q) => `${q}kg`,
  },
  // Grams (g, gr, grs)
  {
    regex: /(\d+(?:[.,]\d+)?)\s*g(?:rs?)?\.?\b/i,
    toBase: (q) => q,
    unit: "g",
    formatLabel: (q) => `${q}g`,
  },
  // Liters (l, lt, lts, ltr, litro, litros)
  {
    regex: /(\d+(?:[.,]\d+)?)\s*l(?:t(?:s|r)?|itros?)?\.?\b/i,
    toBase: (q) => q * 1000,
    unit: "ml",
    formatLabel: (q) => `${q}L`,
  },
  // Milliliters and cc
  {
    regex: /(\d+(?:[.,]\d+)?)\s*(?:ml|cc)\.?\b/i,
    toBase: (q) => q,
    unit: "ml",
    formatLabel: (q) => `${q}ml`,
  },
  // Units/count (un, u, unidades) — for packs like "50u"
  // Skip these — no meaningful price-per-unit comparison
];

// ============================================
// Parser
// ============================================

function parseQuantity(raw: string): number {
  // Handle Argentine decimal format: "1,5" → 1.5
  return parseFloat(raw.replace(",", "."));
}

/**
 * Extract weight/volume from a product name.
 * Returns null if no recognizable unit is found.
 */
export function parseProductUnit(productName: string): UnitInfo | null {
  for (const pattern of UNIT_PATTERNS) {
    const match = productName.match(pattern.regex);
    if (!match?.[1]) continue;

    const rawQuantity = parseQuantity(match[1]);
    if (isNaN(rawQuantity) || rawQuantity <= 0) continue;

    const quantity = pattern.toBase(rawQuantity);

    return {
      quantity,
      unit: pattern.unit,
      unitLabel: pattern.formatLabel(rawQuantity),
    };
  }

  return null;
}
