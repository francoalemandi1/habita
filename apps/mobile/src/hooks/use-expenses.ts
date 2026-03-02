import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import type {
  CreateExpenseInput,
  ExpensesListResponse,
  SerializedExpense,
  UpdateExpenseInput,
} from "@habita/contracts";

const mobileExpenseKeys = {
  all: ["mobile-expenses"] as const,
  list: () => [...mobileExpenseKeys.all, "list"] as const,
};

export function useExpenses() {
  return useQuery({
    queryKey: mobileExpenseKeys.list(),
    queryFn: () => mobileApi.get<ExpensesListResponse>("/api/expenses?limit=50&offset=0"),
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

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { expenseId: string; payload: UpdateExpenseInput }) =>
      mobileApi.patch<SerializedExpense>(`/api/expenses/${input.expenseId}`, input.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mobileExpenseKeys.list() });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) =>
      mobileApi.delete<{ success: boolean }>(`/api/expenses/${expenseId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mobileExpenseKeys.list() });
    },
  });
}
