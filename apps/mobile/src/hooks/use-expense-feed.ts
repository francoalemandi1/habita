import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { mobileApi } from "@/lib/api";
import { queryKeys, expensesListResponseSchema, serializedExpenseSchema } from "@habita/contracts";

import type { SerializedExpense } from "@habita/contracts";

const PAGE_SIZE = 20;

/** `GET /api/expenses/[expenseId]` adds `hasLaterSettlement` to the base expense shape. */
const expenseDetailSchema = serializedExpenseSchema.extend({
  hasLaterSettlement: z.boolean(),
});

export type ExpenseDetail = z.infer<typeof expenseDetailSchema>;

interface ExpensePage {
  expenses: SerializedExpense[];
  nextOffset: number | null;
}

/** Paginated Gastos feed (handoff §5.3 "Plata" — Gastos), `limit`/`offset` per `GET /api/expenses`. */
export function useExpenseFeed() {
  return useInfiniteQuery({
    queryKey: [...queryKeys.expenses.list(), "feed"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<ExpensePage> => {
      const raw = await mobileApi.get<unknown>(`/api/expenses?limit=${PAGE_SIZE}&offset=${pageParam}`);
      const parsed = expensesListResponseSchema.parse(raw);
      return {
        expenses: parsed.expenses,
        nextOffset: parsed.pagination.hasMore ? pageParam + parsed.expenses.length : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });
}

/** Expense detail (handoff §5.3 "Detalle de gasto"), `GET /api/expenses/[expenseId]`. */
export function useExpenseDetail(expenseId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.expenses.all(), "detail", expenseId],
    queryFn: async (): Promise<ExpenseDetail> => {
      const raw = await mobileApi.get<unknown>(`/api/expenses/${expenseId}`);
      return expenseDetailSchema.parse(raw);
    },
    enabled: Boolean(expenseId),
  });
}
