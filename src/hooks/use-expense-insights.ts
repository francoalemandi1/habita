"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@habita/contracts";
import { apiFetch } from "@/lib/api-client";

import type { ExpenseInsightsResponse } from "@/lib/expense-insights";

/** Financial insights for the current household, with isError/refetch (§10). */
export function useExpenseInsights() {
  return useQuery({
    queryKey: queryKeys.expenses.insights(),
    queryFn: () => apiFetch<ExpenseInsightsResponse>("/api/expenses/insights"),
  });
}
