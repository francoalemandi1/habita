import { useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type { ExpenseInsightsResponse } from "@habita/contracts";

export function useExpenseInsights() {
  return useQuery({
    queryKey: queryKeys.expenses.insights(),
    queryFn: async () =>
      mobileApi.get<ExpenseInsightsResponse>("/api/expenses/insights"),
  });
}
