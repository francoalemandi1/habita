"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";

import type { ShoppingPlanResult } from "@/lib/supermarket-search";

// ============================================
// Hook
// ============================================

/**
 * Handles the shopping plan search lifecycle:
 * trigger → loading → result/error.
 *
 * Simple one-shot search — no caching, no React Query.
 * The user triggers it manually with a list of search terms.
 */
export function useShoppingPlan() {
  const [data, setData] = useState<ShoppingPlanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (searchTerms: string[]) => {
    if (searchTerms.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiFetch<ShoppingPlanResult>("/api/ai/shopping-plan", {
        method: "POST",
        body: { searchTerms },
      });
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al buscar precios";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, isLoading, error, search, reset };
}
