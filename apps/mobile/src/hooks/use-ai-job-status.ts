import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { mobileApi } from "@/lib/api";
import { queryKeys } from "@habita/contracts";

import type { AiJobStatusResponse, AiJobType } from "@habita/contracts";
import { POLL_INTERVAL_MS } from "@habita/contracts";

// ============================================
// Hook
// ============================================

interface UseAiJobStatusOptions {
  jobType: AiJobType;
  enabled?: boolean;
  onComplete?: (jobId: string) => void;
  onError?: (errorMessage: string | null) => void;
}

/**
 * Polls /api/ai/job-status to detect whether an AI job is running.
 * Mobile version — uses mobileApi.get().
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
      mobileApi.get<AiJobStatusResponse>(`/api/ai/job-status?type=${jobType}`),
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
