import { useQuery } from "@tanstack/react-query";
import { mobileApi } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

export type EventCategory =
  | "CINE" | "TEATRO" | "MUSICA" | "EXPOSICIONES" | "FESTIVALES"
  | "MERCADOS" | "PASEOS" | "EXCURSIONES" | "TALLERES" | "DANZA"
  | "LITERATURA" | "GASTRONOMIA" | "DEPORTES" | "INFANTIL" | "OTRO";

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  startDate: string | null;
  endDate: string | null;
  venueName: string | null;
  address: string | null;
  cityId: string | null;
  province: string | null;
  category: EventCategory;
  tags: string[];
  artists: string[];
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  editorialHighlight: string | null;
  culturalCategory: string | null;
  ticketUrl: string | null;
  mapsUrl: string | null;
  cityName?: string | null;
}

export interface EventsResponse {
  events: EventItem[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface UseEventsParams {
  city?: string;
  category?: EventCategory;
  q?: string;
  limit?: number;
}

// ── Query keys ─────────────────────────────────────────────────────────────

export const eventsKeys = {
  all: ["mobile", "events"] as const,
  list: (params: UseEventsParams) => [...eventsKeys.all, params] as const,
};

// ── Hook ───────────────────────────────────────────────────────────────────

export function useEvents(params: UseEventsParams = {}) {
  const { city, category, q, limit = 20 } = params;

  return useQuery({
    queryKey: eventsKeys.list(params),
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
