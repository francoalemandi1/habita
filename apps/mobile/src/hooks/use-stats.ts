import { useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type { BriefingResponse, StatsResponse } from "@habita/contracts";

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats.all(),
    queryFn: async () => mobileApi.get<StatsResponse>("/api/stats"),
  });
}

export function useBriefing() {
  return useQuery({
    queryKey: queryKeys.stats.briefing(),
    queryFn: async () => mobileApi.get<BriefingResponse>("/api/briefing"),
  });
}
