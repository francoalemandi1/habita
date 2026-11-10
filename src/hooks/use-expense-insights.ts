"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@habita/contracts";
import { apiFetch } from "@/lib/api-client";

import type { ExpenseInsightsResponse } from "@/lib/expense-insights";

/** Shared by useExpenseInsights and the nav intent prefetch so both hit the same cache entry. */
export function expenseInsightsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.expenses.insights(),
    queryFn: () => apiFetch<ExpenseInsightsResponse>("/api/expenses/insights"),
  });
}

/**
 * Financial insights for the current household, with isError/refetch (§10).
 * `initialData` lets a server-rendered screen paint immediately; it still refetches on mount.
 */
export function useExpenseInsights(initialData?: ExpenseInsightsResponse) {
  return useQuery({ ...expenseInsightsQueryOptions(), initialData });
}
