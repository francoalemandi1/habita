import { useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import type { BriefingResponse, StatsResponse } from "@habita/contracts";

const STATS_KEY = ["mobile", "stats"] as const;
const BRIEFING_KEY = ["mobile", "briefing"] as const;

export function useStats() {
  return useQuery({
    queryKey: STATS_KEY,
    queryFn: async () => mobileApi.get<StatsResponse>("/api/stats"),
  });
}

export function useBriefing() {
  return useQuery({
    queryKey: BRIEFING_KEY,
    queryFn: async () => mobileApi.get<BriefingResponse>("/api/briefing"),
  });
}
