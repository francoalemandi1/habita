/**
 * Pure functions for the Cómo venimos view (handoff §5.3 "Plata" — "Cómo venimos").
 * No side effects, no DB access — fully deterministic and testable.
 *
 * The underlying API (`/api/expenses/insights`) only returns a per-category
 * breakdown for the current month plus up to 6 months of month-level totals
 * (no per-category breakdown for past months). So the "3 meses" / "Año"
 * segments fall back to total-per-month bars — see the Servicios R9b report.
 */

import type { ExpenseCategory } from "@prisma/client";

export type ComoVenimosPeriod = "mes" | "3meses" | "ano";

export const COMO_VENIMOS_PERIODS: Array<{ value: ComoVenimosPeriod; label: string }> = [
  { value: "mes", label: "Mes" },
  { value: "3meses", label: "3 meses" },
  { value: "ano", label: "Año" },
];

export interface CategoryBar {
  category: ExpenseCategory;
  amount: number;
  /** 0-100, relative to the largest category this period. */
  widthPercent: number;
  /** True when this is the category that rose the most vs its average (§9.1 rule: one highlight per screen). */
  isRising: boolean;
}

/** Category bars for the "Mes" segment, highlighting the category that grew the most. */
export function buildCategoryBars(
  categoryBreakdown: ReadonlyArray<{ category: ExpenseCategory; amount: number }>,
  risingCategory: ExpenseCategory | null,
): CategoryBar[] {
  const maxAmount = Math.max(1, ...categoryBreakdown.map((c) => c.amount));
  return [...categoryBreakdown]
    .sort((a, b) => b.amount - a.amount)
    .map((c) => ({
      category: c.category,
      amount: c.amount,
      widthPercent: Math.round((c.amount / maxAmount) * 100),
      isRising: c.category === risingCategory,
    }));
}

export interface MonthTotalBar {
  month: string;
  total: number;
  widthPercent: number;
  isCurrent: boolean;
}

/** Total-per-month bars used as a fallback for "3 meses" / "Año" (no per-category history available). */
export function buildMonthTotalBars(
  monthlyHistory: ReadonlyArray<{ month: string; total: number }>,
  period: "3meses" | "ano",
): MonthTotalBar[] {
  const months = period === "3meses" ? monthlyHistory.slice(-3) : monthlyHistory;
  const maxTotal = Math.max(1, ...months.map((m) => m.total));
  return months.map((m, index) => ({
    month: m.month,
    total: m.total,
    widthPercent: Math.round((m.total / maxTotal) * 100),
    isCurrent: index === months.length - 1,
  }));
}

export type TipTone = "act" | "positive";

/** Ladrillo soft ("act") for critica/alerta, Hoja/monte soft ("positive") for info (§5.3). */
export function tipTone(severity: "info" | "alerta" | "critica"): TipTone {
  return severity === "info" ? "positive" : "act";
}
