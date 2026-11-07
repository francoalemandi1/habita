import { useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type { StatsResponse } from "@habita/contracts";

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats.all(),
    queryFn: async () => mobileApi.get<StatsResponse>("/api/stats"),
  });
}
