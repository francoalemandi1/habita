"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@habita/contracts";

import type { EventsResponse } from "@habita/contracts";

const PLANES_EVENTS_LIMIT = 50;

/** Same `/api/events` list mobile uses for Planes and the Casa Destacado card. */
export function usePlanesEvents() {
  return useQuery<EventsResponse>({
    queryKey: queryKeys.events.list({}),
    queryFn: () => apiFetch<EventsResponse>(`/api/events?limit=${PLANES_EVENTS_LIMIT}`),
    staleTime: 5 * 60 * 1000,
  });
}
