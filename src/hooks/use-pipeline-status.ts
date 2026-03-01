"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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
// Hook
// ============================================

/**
 * Polls /api/events/pipeline-status to detect whether the event pipeline
 * is running for the current household's city.
 *
 * Polling strategy:
 * - On mount: single fetch to check current state
 * - If isRunning: poll every 3s
 * - If not running: stop polling
 * - On window refocus: single re-check
 *
 * When pipeline transitions from running → stopped, automatically
 * invalidates the relax suggestions cache to refresh event data.
 */
export function usePipelineStatus() {
  const queryClient = useQueryClient();
  const wasRunningRef = useRef(false);

  const query = useQuery<PipelineStatusResponse>({
    queryKey: queryKeys.events.pipelineStatus(),
    queryFn: () =>
      apiFetch<PipelineStatusResponse>("/api/events/pipeline-status"),
    refetchInterval: (query) => {
      const isRunning = query.state.data?.isRunning;
      return isRunning ? POLL_INTERVAL_MS : false;
    },
    staleTime: 10_000,
    gcTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const isRunning = query.data?.isRunning ?? false;

  // Detect transition: running → stopped → invalidate event cache
  useEffect(() => {
    if (wasRunningRef.current && !isRunning) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.relax.section("activities"),
      });
    }
    wasRunningRef.current = isRunning;
  }, [isRunning, queryClient]);

  /** Trigger an immediate status re-fetch (called after POST /api/events/refresh). */
  const refetchStatus = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.events.pipelineStatus(),
    });
  }, [queryClient]);

  return {
    isRunning,
    startedAt: query.data?.startedAt ?? null,
    refetchStatus,
  };
}
