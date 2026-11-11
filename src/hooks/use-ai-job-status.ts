"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { detectSettledJob } from "@habita/domain";

import type { AiJobStatusResponse, AiJobType } from "@habita/contracts";
import type { JobObservation } from "@habita/domain";
import { POLL_INTERVAL_MS } from "@habita/contracts";

// ============================================
// Hook
// ============================================

interface UseAiJobStatusOptions {
  jobType: AiJobType;
  /** Only poll when enabled (default: true). */
  enabled?: boolean;
  /** Called once when a job completes (including instant, cached completions). */
  onComplete?: (jobId: string) => void;
  /** Called once when a job fails. */
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
 * Fires the matching callback once per settled job (see detectSettledJob).
 */
export function useAiJobStatus({
  jobType,
  enabled = true,
  onComplete,
  onError,
}: UseAiJobStatusOptions) {
  const queryClient = useQueryClient();
  const previousRef = useRef<JobObservation | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

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

  const isLoaded = query.data !== undefined;

  // Keep the latest callbacks without re-running the settle effect when they change.
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  });

  // Fire once per settled job, including jobs that finished before any poll saw them
  // running (cached results), which a RUNNING → SUCCESS check alone would miss.
  useEffect(() => {
    if (!isLoaded) return;
    const current = { status, jobId };
    const settlement = detectSettledJob(previousRef.current, current);
    previousRef.current = current;
    if (settlement === "completed" && jobId) onCompleteRef.current?.(jobId);
    if (settlement === "failed") onErrorRef.current?.(query.data?.errorMessage ?? null);
  }, [isLoaded, status, jobId, query.data?.errorMessage]);

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
