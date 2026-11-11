"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api-client";

import type { ExpenseDetailData } from "@/lib/expense-detail-loader";

/** Shared by useExpenseDetail and the detail panel's invalidation on update/delete. */
export function expenseDetailQueryOptions(expenseId: string) {
  return queryOptions({
    queryKey: queryKeys.expenses.detail(expenseId),
    queryFn: () => apiFetch<ExpenseDetailData>(`/api/expenses/${expenseId}/detail`),
  });
}

/** Expense detail for the desktop Gastos split-panel; disabled while no row is selected. */
export function useExpenseDetail(expenseId: string | null) {
  return useQuery({
    ...expenseDetailQueryOptions(expenseId ?? ""),
    enabled: expenseId !== null,
  });
}
