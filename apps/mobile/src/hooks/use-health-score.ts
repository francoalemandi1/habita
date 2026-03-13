import { useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";
import { queryKeys } from "@habita/contracts";
import type { HouseholdHealthScore } from "@habita/contracts";

export function useHealthScore() {
  return useQuery({
    queryKey: queryKeys.household.healthScore(),
    queryFn: async () => mobileApi.get<HouseholdHealthScore>("/api/household/health-score"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
