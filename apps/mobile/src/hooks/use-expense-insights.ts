import { useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import type { ExpenseInsightsResponse } from "@habita/contracts";

const EXPENSE_INSIGHTS_KEY = ["mobile", "expenses", "insights"] as const;

export function useExpenseInsights() {
  return useQuery({
    queryKey: EXPENSE_INSIGHTS_KEY,
    queryFn: async () =>
      mobileApi.get<ExpenseInsightsResponse>("/api/expenses/insights"),
  });
}
