import { useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

import { queryKeys } from "@habita/contracts";
import type { EventCategory, EventItem, EventsResponse } from "@habita/contracts";

export type { EventCategory, EventItem, EventsResponse };

// ── Types (hook-specific) ───────────────────────────────────────────────────

export interface UseEventsParams {
  city?: string;
  category?: EventCategory;
  q?: string;
  limit?: number;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useEvents(params: UseEventsParams = {}) {
  const { city, category, q, limit = 20 } = params;

  return useQuery({
    queryKey: queryKeys.events.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (city) searchParams.set("city", city);
      if (category) searchParams.set("category", category);
      if (q) searchParams.set("q", q);
      searchParams.set("limit", String(limit));

      const qs = searchParams.toString();
      return mobileApi.get<EventsResponse>(`/api/events${qs ? `?${qs}` : ""}`);
    },
    staleTime: 5 * 60 * 1000, // 5 min — events don't change that often
  });
}
