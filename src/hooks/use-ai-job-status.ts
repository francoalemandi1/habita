"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import type { AiJobStatusResponse, AiJobType } from "@habita/contracts";

// ============================================
// Constants
// ============================================

/** Poll every 3 seconds while a job is running. */
const POLL_INTERVAL_MS = 3_000;

// ============================================
// Hook
// ============================================

interface UseAiJobStatusOptions {
  jobType: AiJobType;
  /** Only poll when enabled (default: true). */
  enabled?: boolean;
  /** Called when job transitions from RUNNING → SUCCESS. */
  onComplete?: (jobId: string) => void;
  /** Called when job transitions from RUNNING → FAILED. */
  onError?: (errorMessage: string | null) => void;
}

/**
 * Polls /api/ai/job-status to detect whether an AI job is running.
 *
 * Polling strategy (mirrors use-pipeline-status.ts):
 * - On mount: single fetch to check current state
 * - If RUNNING: poll every 3s
 * - If not running: stop polling
 * - On window refocus: single re-check
 *
 * When a job transitions from RUNNING → SUCCESS/FAILED,
 * fires the appropriate callback.
 */
export function useAiJobStatus({
  jobType,
  enabled = true,
  onComplete,
  onError,
}: UseAiJobStatusOptions) {
  const queryClient = useQueryClient();
  const wasRunningRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  const query = useQuery<AiJobStatusResponse>({
    queryKey: queryKeys.aiJobs.status(jobType),
    queryFn: () =>
      apiFetch<AiJobStatusResponse>(`/api/ai/job-status?type=${jobType}`),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "RUNNING" ? POLL_INTERVAL_MS : false;
    },
    staleTime: 10_000,
    gcTime: 60_000,
    refetchOnWindowFocus: true,
    enabled,
  });

  const status = query.data?.status ?? null;
  const jobId = query.data?.jobId ?? null;

  // Detect transition: RUNNING → SUCCESS/FAILED
  useEffect(() => {
    if (wasRunningRef.current && status !== "RUNNING" && status !== null) {
      if (status === "SUCCESS" && jobId) {
        onCompleteRef.current?.(jobId);
      } else if (status === "FAILED") {
        onErrorRef.current?.(query.data?.errorMessage ?? null);
      }
    }
    wasRunningRef.current = status === "RUNNING";
  }, [status, jobId, query.data?.errorMessage]);

  /** Force an immediate re-fetch (call after triggering a new job). */
  const refetchStatus = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.aiJobs.status(jobType),
    });
  }, [queryClient, jobType]);

  return {
    status,
    jobId,
    startedAt: query.data?.startedAt ?? null,
    isRunning: status === "RUNNING",
    refetchStatus,
  };
}
