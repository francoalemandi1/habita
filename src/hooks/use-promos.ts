"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import type { BankPromo } from "@prisma/client";

// ============================================
// Types
// ============================================

interface PipelineStatusResponse {
  isRunning: boolean;
  startedAt: string | null;
}

// ============================================
// Constants
// ============================================

/** Poll every 3 seconds while pipeline is running. */
const POLL_INTERVAL_MS = 3_000;

// ============================================
// usePromos — fetch bank promos for the household
// ============================================

export function usePromos() {
  return useQuery<BankPromo[]>({
    queryKey: queryKeys.promos.list(),
    queryFn: () => apiFetch<BankPromo[]>("/api/promos"),
    staleTime: 5 * 60 * 1000, // 5 min — promos change rarely
    gcTime: 30 * 60 * 1000,
  });
}

// ============================================
// useRefreshPromos — trigger pipeline
// ============================================

export function useRefreshPromos() {
  return useCallback(async () => {
    return apiFetch<{ started: boolean; alreadyRunning: boolean }>(
      "/api/promos/refresh",
      { method: "POST" },
    );
  }, []);
}

// ============================================
// usePromoPipelineStatus — poll while running
// ============================================

/**
 * Polls /api/promos/pipeline-status while pipeline is running.
 * When pipeline transitions running → stopped, auto-invalidates promos cache.
 */
export function usePromoPipelineStatus() {
  const queryClient = useQueryClient();
  const wasRunningRef = useRef(false);

  const query = useQuery<PipelineStatusResponse>({
    queryKey: queryKeys.promos.pipelineStatus(),
    queryFn: () =>
      apiFetch<PipelineStatusResponse>("/api/promos/pipeline-status"),
    refetchInterval: (query) => {
      const isRunning = query.state.data?.isRunning;
      return isRunning ? POLL_INTERVAL_MS : false;
    },
    staleTime: 10_000,
    gcTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const isRunning = query.data?.isRunning ?? false;

  // When pipeline finishes, invalidate promos cache
  useEffect(() => {
    if (wasRunningRef.current && !isRunning) {
      queryClient.invalidateQueries({ queryKey: queryKeys.promos.list() });
    }
    wasRunningRef.current = isRunning;
  }, [isRunning, queryClient]);

  const refetchStatus = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.promos.pipelineStatus(),
    });
  }, [queryClient]);

  return {
    isRunning,
    startedAt: query.data?.startedAt ?? null,
    refetchStatus,
  };
}

// ============================================
// Helper: get promos for a specific store
// ============================================

export function getStorePromos(
  promos: BankPromo[] | undefined,
  storeName: string,
): BankPromo[] {
  if (!promos) return [];
  return promos.filter((p) => p.storeName === storeName);
}
