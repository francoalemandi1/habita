import type { ProductUnitInfo } from "@/lib/supermarket-search";
import type { AdjustedCartProduct } from "@habita/prices";
import type { BankPromo } from "@prisma/client";

export function formatUnitLabel(unitInfo: ProductUnitInfo): string {
  if (unitInfo.unit === "g") {
    const perKg = (unitInfo.pricePerUnit * 1000).toLocaleString("es-AR", {
      maximumFractionDigits: 0,
    });
    return `${unitInfo.unitLabel} · $${perKg}/kg`;
  }
  const perLiter = (unitInfo.pricePerUnit * 1000).toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  });
  return `${unitInfo.unitLabel} · $${perLiter}/L`;
}

export function formatPrice(price: number): string {
  return `$${price.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function buildSuggestedReplaceQuery(product: AdjustedCartProduct): string {
  const baseTerm = product.searchTerm.trim();
  if (!product.unitInfo) return baseTerm;
  const normalizedBase = baseTerm.toLowerCase();
  const unitLabel = product.unitInfo.unitLabel.toLowerCase();
  if (normalizedBase.includes(unitLabel)) return baseTerm;
  return `${baseTerm} ${product.unitInfo.unitLabel}`.trim();
}

export function calcDiscountedPrice(totalPrice: number, discountPercent: number, capAmount: number | null): number {
  const rawDiscount = (totalPrice * discountPercent) / 100;
  const actualDiscount = capAmount && capAmount > 0 ? Math.min(rawDiscount, capAmount) : rawDiscount;
  return Math.round(totalPrice - actualDiscount);
}

export function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("parseJsonArray: failed to parse promo payment methods", error);
    return [];
  }
}

export function formatCapShort(capAmount: number | null): string | null {
  if (!capAmount) return null;
  return `$${capAmount.toLocaleString("es-AR")}`;
}

/** Builds the collapsed promo banner summary without a nested ternary. */
export function getPromoSummaryText(
  selectedBank: BankPromo | null,
  bestPerBank: BankPromo[],
  best: BankPromo,
  formatDaysShort: (daysOfWeek: string, options: { allDaysLabel: string }) => string,
): string {
  if (selectedBank) {
    return `${selectedBank.discountPercent}% ${selectedBank.bankDisplayName}`;
  }
  if (bestPerBank.length === 1) {
    return `${best.discountPercent}% ${best.bankDisplayName} (${formatDaysShort(best.daysOfWeek, { allDaysLabel: "Todos" })})`;
  }
  return `Hasta ${best.discountPercent}% dto · ${bestPerBank.length} bancos`;
}
