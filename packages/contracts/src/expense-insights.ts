import { z } from "zod";
import { expenseCategorySchema } from "./expenses";

export const monthStatusSchema = z.enum(["stable", "above_average", "well_below"]);
export const spendingTipSeveritySchema = z.enum(["info", "alerta", "critica"]);

export const spendingTipSchema = z.object({
  id: z.string(),
  emoji: z.string(),
  message: z.string(),
  severity: spendingTipSeveritySchema,
  action: z
    .object({
      label: z.string(),
      href: z.string(),
    })
    .optional(),
});

export const categoryAmountSchema = z.object({
  category: expenseCategorySchema,
  amount: z.number(),
});

export const expenseInsightsResponseSchema = z.object({
  variableDailyAverage: z.number(),
  variableProjected: z.number(),
  fixedThisMonth: z.number(),
  expectedFixedMonthly: z.number(),
  thisMonthTotal: z.number(),
  projectedTotal: z.number(),
  upcomingServicesCost: z.number(),
  upcomingServicesCount: z.number().int().nonnegative(),
  spendingTips: z.array(spendingTipSchema),
  monthStatus: monthStatusSchema,
  variableVsAverageTrend: z.enum(["up", "down", "flat"]),
  variableVsAveragePercent: z.number(),
  categoryBreakdown: z.array(categoryAmountSchema),
});

export type SpendingTip = z.infer<typeof spendingTipSchema>;
export type ExpenseInsightsResponse = z.infer<typeof expenseInsightsResponseSchema>;
