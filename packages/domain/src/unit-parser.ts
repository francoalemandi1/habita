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
