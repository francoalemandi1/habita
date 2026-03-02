"use client";

import { useState, useEffect, useCallback } from "react";

import type { ExpenseInsightsResponse, FrequentExpense } from "@/lib/expense-insights";

// ============================================
// Types
// ============================================

interface UseExpenseInsightsOptions {
  /** Increment to trigger a re-fetch (e.g. after expense mutations). */
  refreshKey?: number;
  /** Reports frequent expenses when data is loaded (for rendering pills elsewhere). */
  onFrequentExpensesLoaded?: (expenses: FrequentExpense[]) => void;
}

interface UseExpenseInsightsResult {
  data: ExpenseInsightsResponse | null;
  isLoading: boolean;
}

// ============================================
// Hook
// ============================================

export function useExpenseInsights({
  refreshKey,
  onFrequentExpensesLoaded,
}: UseExpenseInsightsOptions): UseExpenseInsightsResult {
  const [data, setData] = useState<ExpenseInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/expenses/insights");
      if (!response.ok) return;
      const result = (await response.json()) as ExpenseInsightsResponse;
      setData(result);
      onFrequentExpensesLoaded?.(result.frequentExpenses);
    } catch {
      // Silently skip — insights are non-critical
    } finally {
      setIsLoading(false);
    }
  }, [onFrequentExpensesLoaded]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights, refreshKey]);

  return { data, isLoading };
}
