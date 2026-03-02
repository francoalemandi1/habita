"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";

import type { FundState, CreateContributionPayload, CreateFundPayload, UpdateAllocationsPayload } from "@/types/fund";

// ============================================
// Types
// ============================================

interface UseFundOptions {
  /** Increment to trigger a re-fetch. */
  refreshKey?: number;
}

export interface UseFundResult {
  fund: FundState | null;
  isLoading: boolean;
  refresh: () => void;
  contribute: (payload: CreateContributionPayload) => Promise<void>;
  setup: (payload: CreateFundPayload) => Promise<void>;
  updateAllocations: (payload: UpdateAllocationsPayload) => Promise<void>;
}

// ============================================
// Hook
// ============================================

export function useFund({ refreshKey }: UseFundOptions = {}): UseFundResult {
  const [fund, setFund] = useState<FundState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [internalKey, setInternalKey] = useState(0);

  const fetchFund = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/fund");
      if (!response.ok) return;
      const result = (await response.json()) as FundState | null;
      setFund(result);
    } catch {
      // Silently skip — fund is non-critical
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFund();
  }, [fetchFund, refreshKey, internalKey]);

  const refresh = useCallback(() => {
    setInternalKey((k) => k + 1);
  }, []);

  const contribute = useCallback(
    async (payload: CreateContributionPayload) => {
      await apiFetch("/api/fund/contribute", { method: "POST", body: payload });
      refresh();
    },
    [refresh],
  );

  const setup = useCallback(
    async (payload: CreateFundPayload) => {
      await apiFetch("/api/fund/setup", { method: "POST", body: payload });
      refresh();
    },
    [refresh],
  );

  const updateAllocations = useCallback(
    async (payload: UpdateAllocationsPayload) => {
      await apiFetch("/api/fund/allocations", { method: "PUT", body: payload });
      refresh();
    },
    [refresh],
  );

  return { fund, isLoading, refresh, contribute, setup, updateAllocations };
}
