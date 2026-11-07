import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { expenseInsightsResponseSchema, queryKeys } from "@habita/contracts";
import { mobileApi } from "@/lib/api";

/** The insights fields the Gastos header reads (month total, mini bars, comparison line). */
const plataInsightsSchema = expenseInsightsResponseSchema.pick({
  thisMonthTotal: true,
  projectedTotal: true,
  hasReliableMonthlyTrend: true,
  monthlyHistory: true,
});

export type PlataInsights = z.infer<typeof plataInsightsSchema>;

/**
 * Shares the `expenses.insights()` cache with `useExpenseInsights`, so both
 * screens make one request; only the fields Gastos needs are validated.
 */
export function usePlataInsights() {
  return useQuery({
    queryKey: queryKeys.expenses.insights(),
    queryFn: () => mobileApi.get<unknown>("/api/expenses/insights"),
    select: (raw): PlataInsights => plataInsightsSchema.parse(raw),
  });
}
