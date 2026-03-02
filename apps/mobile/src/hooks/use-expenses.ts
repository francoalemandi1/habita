import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import type { CreateExpenseInput, ExpensesListResponse, SerializedExpense } from "@habita/contracts";

const mobileExpenseKeys = {
  all: ["mobile-expenses"] as const,
  list: () => [...mobileExpenseKeys.all, "list"] as const,
};

export function useExpenses() {
  return useQuery({
    queryKey: mobileExpenseKeys.list(),
    queryFn: () => mobileApi.get<ExpensesListResponse>("/api/expenses?limit=20&offset=0"),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateExpenseInput) =>
      mobileApi.post<SerializedExpense>("/api/expenses", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mobileExpenseKeys.list() });
    },
  });
}
