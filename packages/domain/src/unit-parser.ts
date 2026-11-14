export interface UnitInfo {
  quantity: number;
  unit: "g" | "ml";
  unitLabel: string;
}

interface UnitPattern {
  regex: RegExp;
  toBase: (quantity: number) => number;
  unit: "g" | "ml";
  formatLabel: (quantity: number) => string;
}

const UNIT_PATTERNS: UnitPattern[] = [
  {
    regex: /(\d+(?:[.,]\d+)?)\s*kg\b/i,
    toBase: (quantity) => quantity * 1000,
    unit: "g",
    formatLabel: (quantity) => `${quantity}kg`,
  },
  {
    regex: /(\d+(?:[.,]\d+)?)\s*g(?:rs?)?\.?\b/i,
    toBase: (quantity) => quantity,
    unit: "g",
    formatLabel: (quantity) => `${quantity}g`,
  },
  {
    regex: /(\d+(?:[.,]\d+)?)\s*l(?:t(?:s|r)?|itros?)?\.?\b/i,
    toBase: (quantity) => quantity * 1000,
    unit: "ml",
    formatLabel: (quantity) => `${quantity}L`,
  },
  {
    regex: /(\d+(?:[.,]\d+)?)\s*(?:ml|cc)\.?\b/i,
    toBase: (quantity) => quantity,
    unit: "ml",
    formatLabel: (quantity) => `${quantity}ml`,
  },
];

function parseQuantity(rawValue: string): number {
  return parseFloat(rawValue.replace(",", "."));
}

export function parseProductUnit(productName: string): UnitInfo | null {
  for (const pattern of UNIT_PATTERNS) {
    const match = productName.match(pattern.regex);
    if (!match?.[1]) continue;

    const rawQuantity = parseQuantity(match[1]);
    if (Number.isNaN(rawQuantity) || rawQuantity <= 0) continue;

    return {
      quantity: pattern.toBase(rawQuantity),
      unit: pattern.unit,
      unitLabel: pattern.formatLabel(rawQuantity),
    };
  }

  return null;
}

// ============================================
// Pack count ("6 Ud.", "x 30 un", "Pack 6")
// ============================================

const MIN_PACK_COUNT = 2;
const MAX_PACK_COUNT = 200;

/** A count immediately followed by "Ud."/"un"/"unidades": the pack size, never the earlier weight/volume figure. */
const COUNT_KEYWORD_SUFFIX = /(\d+)\s*(?:uds?|uni(?:d(?:ad(?:es)?)?)?|un|u)\b\.?/i;

/** "Pack 6 Latas ...": the count leads the name instead of trailing a keyword. */
const PACK_PREFIX = /\bpack\s+(\d+)\b/i;

/** A weight/volume token glued to the number must disqualify it ("x 500 g", "x1kg" are not counts). */
const WEIGHT_VOLUME_SUFFIX = /(?:kgs|kg|grs|gr|g|lts|lt|l|mls|ml|cc|metros|mts|mt|m)\b/i;

/** "x6"/"x 6" with nothing after: a bare multiplier count, as long as it isn't a weight/volume figure. */
const X_BARE_COUNT = new RegExp(`\\bx\\s*(\\d+)\\b(?!\\s*${WEIGHT_VOLUME_SUFFIX.source})`, "i");

/** "4x30 M", "4 X 80 M", "4x20": N items of a size. The size must carry a unit or be ≥ 10 so promos like "2x1" don't count. */
const COUNT_TIMES_SIZE = new RegExp(`\\b(\\d+)\\s*x\\s*(\\d+(?:[.,]\\d+)?)\\s*(${WEIGHT_VOLUME_SUFFIX.source})?`, "i");
const MIN_UNITLESS_SIZE = 10;

function matchCountTimesSize(productName: string): number | null {
  const match = productName.match(COUNT_TIMES_SIZE);
  if (!match?.[1] || !match[2]) return null;
  const hasUnit = Boolean(match[3]);
  const size = parseFloat(match[2].replace(",", "."));
  if (!hasUnit && size < MIN_UNITLESS_SIZE) return null;
  return parseInt(match[1], 10);
}

function extractPackCandidate(productName: string): number | null {
  const suffixMatch = productName.match(COUNT_KEYWORD_SUFFIX);
  if (suffixMatch?.[1]) return parseInt(suffixMatch[1], 10);

  const timesSize = matchCountTimesSize(productName);
  if (timesSize !== null) return timesSize;

  const packMatch = productName.match(PACK_PREFIX);
  if (packMatch?.[1]) return parseInt(packMatch[1], 10);

  const bareMatch = productName.match(X_BARE_COUNT);
  if (bareMatch?.[1]) return parseInt(bareMatch[1], 10);

  return null;
}

/** Number of units in a pack declared in the product name ("6 Ud." → 6), or null when no pack count is declared. */
export function parsePackCount(productName: string): number | null {
  const candidate = extractPackCandidate(productName);
  if (candidate === null || Number.isNaN(candidate)) return null;
  if (candidate < MIN_PACK_COUNT || candidate > MAX_PACK_COUNT) return null;
  return candidate;
}
