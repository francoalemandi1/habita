"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import type { EventCategory } from "@prisma/client";
import type { RelaxEvent } from "@/lib/llm/relax-finder";

// ============================================
// Types
// ============================================

/** API response shape from /api/events and /api/events/weekend */
interface EventsApiRow {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  startDate: string | null;
  endDate: string | null;
  venueName: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
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
  status: string;
  cityName?: string | null;
  cityProvince?: string | null;
}

interface EventsListResponse {
  events: EventsApiRow[];
  total: number;
  pagination: { limit: number; offset: number; hasMore: boolean };
}

interface WeekendEventsResponse {
  events: EventsApiRow[];
  cityId: string | null;
}

export interface EventsQueryResult {
  events: RelaxEvent[];
  total: number;
  source: "platform";
}

// ============================================
// Category enum → lowercase map (matches RelaxClient category keys)
// ============================================

const CATEGORY_TO_RELAX: Record<EventCategory, string> = {
  CINE: "cine",
  TEATRO: "teatro",
  MUSICA: "musica",
  EXPOSICIONES: "exposiciones",
  FESTIVALES: "festivales",
  MERCADOS: "mercados",
  PASEOS: "paseos",
  EXCURSIONES: "excursiones",
  TALLERES: "talleres",
  DANZA: "musica",
  LITERATURA: "exposiciones",
  GASTRONOMIA: "festivales",
  DEPORTES: "paseos",
  INFANTIL: "talleres",
  OTRO: "exposiciones",
};

// ============================================
// Mappers
// ============================================

function formatEventDate(startDate: string | null, endDate: string | null): string {
  if (!startDate) return "Consultar";

  const start = new Date(startDate);
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  const dayName = dayNames[start.getDay()];
  const day = start.getDate();
  const month = monthNames[start.getMonth()];

  const timeStr = start.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

  let result = `${dayName} ${day} ${month}, ${timeStr}`;

  if (endDate) {
    const end = new Date(endDate);
    const endTime = end.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

    // Same day: show "Sáb 22 feb, 11:00 a 20:00"
    if (start.toDateString() === end.toDateString()) {
      result = `${dayName} ${day} ${month}, ${timeStr} a ${endTime}`;
    } else {
      // Multi-day: "Sáb 22 feb a Dom 23 feb"
      const endDayName = dayNames[end.getDay()];
      const endDay = end.getDate();
      const endMonth = monthNames[end.getMonth()];
      result = `${dayName} ${day} ${month} a ${endDayName} ${endDay} ${endMonth}`;
    }
  }

  return result;
}

function formatPrice(priceMin: number | null, priceMax: number | null, currency: string | null): string {
  if (priceMin === null && priceMax === null) return "Consultar";
  if (priceMin === 0 && (priceMax === null || priceMax === 0)) return "Gratis";

  const cur = currency ?? "ARS";
  if (priceMin !== null && priceMax !== null && priceMin !== priceMax) {
    return `${cur} ${priceMin.toLocaleString("es-AR")}-${priceMax.toLocaleString("es-AR")}`;
  }

  const price = priceMin ?? priceMax ?? 0;
  return `${cur} ${price.toLocaleString("es-AR")}`;
}

function buildVenueLabel(row: EventsApiRow): string {
  const parts: string[] = [];
  if (row.venueName) parts.push(row.venueName);
  if (row.address) parts.push(row.address);
  if (parts.length > 0) return parts.join(", ");
  if (row.cityName) return row.cityName;
  return "Consultar";
}

function buildMapsUrl(row: EventsApiRow): string | null {
  if (row.latitude && row.longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${row.latitude},${row.longitude}`;
  }
  const venue = row.venueName ?? row.address;
  if (venue) {
    const city = row.cityName ?? "";
    const destination = encodeURIComponent(`${venue}, ${city}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  }
  return null;
}

/** Convert an API event row to the RelaxEvent shape used by EventCard. */
export function eventRowToRelaxEvent(row: EventsApiRow): RelaxEvent {
  return {
    title: row.title,
    description: row.description ?? "",
    category: CATEGORY_TO_RELAX[row.category] ?? "exposiciones",
    venue: buildVenueLabel(row),
    dateInfo: formatEventDate(row.startDate, row.endDate),
    priceRange: formatPrice(row.priceMin, row.priceMax, row.currency),
    audience: null,
    tip: row.artists.length > 0 ? row.artists.join(", ") : null,
    url: buildMapsUrl(row),
    sourceUrl: row.sourceUrl,
    imageUrl: row.imageUrl,
  };
}

// ============================================
// Constants
// ============================================

const TEN_MINUTES_MS = 10 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

// ============================================
// Hooks
// ============================================

interface UseEventsOptions {
  city?: string;
  enabled?: boolean;
}

/**
 * Fetches events from the platform API (/api/events).
 * Returns events mapped to RelaxEvent shape for EventCard compatibility.
 */
export function useEvents({ city, enabled = true }: UseEventsOptions) {
  return useQuery<EventsQueryResult>({
    queryKey: queryKeys.events.list(city),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (city) params.set("city", city);
      params.set("limit", "30");

      const url = `/api/events${params.toString() ? `?${params.toString()}` : ""}`;
      const data = await apiFetch<EventsListResponse>(url);

      return {
        events: data.events.map(eventRowToRelaxEvent),
        total: data.total,
        source: "platform" as const,
      };
    },
    enabled,
    staleTime: TEN_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetches weekend events from the platform API (/api/events/weekend).
 * Returns events mapped to RelaxEvent shape for EventCard compatibility.
 */
export function useWeekendEvents({ city, enabled = true }: UseEventsOptions) {
  return useQuery<EventsQueryResult>({
    queryKey: queryKeys.events.weekend(city),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (city) params.set("city", city);

      const url = `/api/events/weekend${params.toString() ? `?${params.toString()}` : ""}`;
      const data = await apiFetch<WeekendEventsResponse>(url);

      return {
        events: data.events.map(eventRowToRelaxEvent),
        total: data.events.length,
        source: "platform" as const,
      };
    },
    enabled,
    staleTime: TEN_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  });
}
