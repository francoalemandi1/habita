import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

export interface BankPromo {
  id: string;
  householdId: string;
  bankSlug: string;
  bankDisplayName: string;
  storeName: string;
  title: string | null;
  description: string | null;
  discountPercent: number;
  daysOfWeek: string;        // JSON array string e.g. '["Jueves"]'
  paymentMethods: string | null;  // JSON array string
  eligiblePlans: string | null;   // JSON array string
  capAmount: number | null;
  validUntil: string | null;
  sourceUrl: string | null;
  createdAt: string;
}

export interface PromoPipelineStatus {
  isRunning: boolean;
  startedAt: string | null;
}

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

// ── Query keys ─────────────────────────────────────────────────────────────

const PROMOS_KEY = ["mobile", "promos"] as const;
const PIPELINE_STATUS_KEY = ["mobile", "promos", "pipeline-status"] as const;

// ── Hooks ──────────────────────────────────────────────────────────────────

export function usePromos(storeName?: string) {
  return useQuery({
    queryKey: storeName ? [...PROMOS_KEY, storeName] : PROMOS_KEY,
    queryFn: async () => {
      const qs = storeName ? `?storeName=${encodeURIComponent(storeName)}` : "";
      return mobileApi.get<BankPromo[]>(`/api/promos${qs}`);
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });
}

export function usePromoPipelineStatus() {
  return useQuery({
    queryKey: PIPELINE_STATUS_KEY,
    queryFn: async () => mobileApi.get<PromoPipelineStatus>("/api/promos/pipeline-status"),
    refetchInterval: (query) => {
      // Poll every 3s while running, stop when done
      return query.state.data?.isRunning ? 3000 : false;
    },
  });
}

export function useRefreshPromos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => mobileApi.post("/api/promos/refresh", {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PIPELINE_STATUS_KEY });
      // Promos will refresh once pipeline completes (user can pull-to-refresh)
    },
  });
}
