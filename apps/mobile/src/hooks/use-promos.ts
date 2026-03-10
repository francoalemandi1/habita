import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys, POLL_INTERVAL_MS } from "@habita/contracts";
import type { BankPromo, PromoPipelineStatus } from "@habita/contracts";

export type { BankPromo, PromoPipelineStatus };

// ── Helpers ────────────────────────────────────────────────────────────────

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function usePromos(storeName?: string) {
  return useQuery({
    queryKey: storeName ? [...queryKeys.promos.all(), storeName] : queryKeys.promos.all(),
    queryFn: async () => {
      const qs = storeName ? `?storeName=${encodeURIComponent(storeName)}` : "";
      return mobileApi.get<BankPromo[]>(`/api/promos${qs}`);
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });
}

export function usePromoPipelineStatus() {
  return useQuery({
    queryKey: queryKeys.promos.pipelineStatus(),
    queryFn: async () => mobileApi.get<PromoPipelineStatus>("/api/promos/pipeline-status"),
    refetchInterval: (query) => {
      // Poll every 3s while running, stop when done
      return query.state.data?.isRunning ? POLL_INTERVAL_MS : false;
    },
  });
}

export function useRefreshPromos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => mobileApi.post("/api/promos/refresh", {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.promos.pipelineStatus() });
      // Promos will refresh once pipeline completes (user can pull-to-refresh)
    },
  });
}
