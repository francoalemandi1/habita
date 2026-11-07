/**
 * Pure functions for the mobile Cómo venimos screen (handoff §5.3 "Plata" —
 * "Cómo venimos"). No side effects — fully deterministic and testable.
 *
 * The underlying API only returns a per-category breakdown for the current
 * month plus up to 6 months of month-level totals (no per-category history
 * for past months). "3 meses" / "Año" fall back to total-per-month bars —
 * see the Servicios R9b report.
 */
import { z } from "zod";

import { isExpenseCategory } from "./plata-expense-category";

import type { ExpenseCategory, ExpenseInsightsResponse } from "@habita/contracts";

type CategoryAmount = ExpenseInsightsResponse["categoryBreakdown"][number];

export type ComoVenimosPeriod = "mes" | "3meses" | "ano";

export const COMO_VENIMOS_PERIODS: Array<{ value: ComoVenimosPeriod; label: string }> = [
  { value: "mes", label: "Mes" },
  { value: "3meses", label: "3 meses" },
  { value: "ano", label: "Año" },
];

export interface CategoryBar {
  category: ExpenseCategory;
  amount: number;
  widthPercent: number;
  isRising: boolean;
}

export function buildCategoryBars(
  categoryBreakdown: readonly CategoryAmount[],
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

export function buildMonthTotalBars(
  monthlyHistory: ExpenseInsightsResponse["monthlyHistory"],
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

export function tipTone(severity: "info" | "alerta" | "critica"): TipTone {
  return severity === "info" ? "positive" : "act";
}

const topGrowthCategorySchema = z.object({
  category: z.string(),
  currentAmount: z.number(),
  averageAmount: z.number(),
  growthPercent: z.number(),
});

const responseWithTopGrowthSchema = z
  .object({ topGrowthCategory: topGrowthCategorySchema.nullable().optional() })
  .passthrough();

/**
 * `ExpenseInsightsResponse` from `@habita/contracts` doesn't declare
 * `topGrowthCategory` (it's not in the shared zod schema), but the real API
 * response includes it — `mobileApi.get` does a typed cast, not runtime
 * validation, so the field is present on the raw JSON. Validated here with
 * Zod, with no unchecked `as`, per CLAUDE.md.
 */
export function readTopGrowthCategory(data: unknown): ExpenseCategory | null {
  const parsed = responseWithTopGrowthSchema.safeParse(data);
  if (!parsed.success) return null;
  const category = parsed.data.topGrowthCategory?.category;
  return category != null && isExpenseCategory(category) ? category : null;
}
