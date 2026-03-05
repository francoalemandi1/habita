import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@habita/contracts";

import { mobileApi } from "@/lib/api";

interface CityResult {
  id: string;
  name: string;
  province: string;
  latitude?: number;
  longitude?: number;
}

interface CitiesResponse {
  cities: CityResult[];
}

export type { CityResult };

export function useCitySearch(query: string) {
  return useQuery({
    queryKey: queryKeys.cities.search(query),
    queryFn: async () => mobileApi.get<CitiesResponse>(`/api/cities?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // cities don't change often
  });
}
