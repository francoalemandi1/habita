"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import type { TopDealsResponse } from "@habita/contracts";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

/**
 * Fetches top deals across all grocery categories.
 * Data comes from server-side cache — no scraping on the client.
 */
export function useTopDeals() {
  return useQuery<TopDealsResponse>({
    queryKey: queryKeys.grocery.topDeals(),
    queryFn: () => apiFetch<TopDealsResponse>("/api/ai/grocery-deals/top"),
    staleTime: FIVE_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
  });
}
