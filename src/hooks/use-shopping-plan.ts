"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { useAiJobStatus } from "@/hooks/use-ai-job-status";

import type { SearchItem, ShoppingPlanResult } from "@/lib/supermarket-search";
import type { AiJobTriggerResponse } from "@habita/contracts";

// ============================================
// Hook
// ============================================

/**
 * Handles the shopping plan search lifecycle:
 * trigger → polling → result/error.
 *
 * The POST now returns immediately (fire-and-forget).
 * Polling via useAiJobStatus detects completion and fetches the result.
 */
export function useShoppingPlan() {
  const [data, setData] = useState<ShoppingPlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);

  const { isRunning, refetchStatus } = useAiJobStatus({
    jobType: "SHOPPING_PLAN",
    onComplete: async (jobId) => {
      try {
        const result = await apiFetch<{
          resultData: ShoppingPlanResult;
        }>(`/api/ai/job-result/${jobId}`);
        setData(result.resultData);
      } catch {
        setError("Error al obtener los resultados");
      }
    },
    onError: (errorMessage) => {
      setError(errorMessage ?? "Error al buscar precios");
    },
  });

  const isLoading = triggerLoading || isRunning;

  const search = useCallback(async (searchItems: SearchItem[], preferredBankSlugs?: string[]) => {
    if (searchItems.length === 0) return;

    setTriggerLoading(true);
    setError(null);

    try {
      await apiFetch<AiJobTriggerResponse>("/api/ai/shopping-plan", {
        method: "POST",
        body: { searchItems, ...(preferredBankSlugs?.length ? { preferredBankSlugs } : {}) },
      });
      // Trigger an immediate re-fetch of the job status
      await refetchStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al buscar precios";
      setError(message);
    } finally {
      setTriggerLoading(false);
    }
  }, [refetchStatus]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  const restore = useCallback((previousData: ShoppingPlanResult) => {
    setData(previousData);
    setError(null);
  }, []);

  return { data, isLoading, error, search, reset, restore };
}
