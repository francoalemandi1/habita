"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import type { GeolocationResult } from "@/hooks/use-geolocation";
import type { RelaxEvent, RelaxSection } from "@/lib/events/types";

// ============================================
// Types
// ============================================

export interface RelaxSuggestionsResponse {
  events: RelaxEvent[];
  summary: string;
  generatedAt: string;
  cached?: boolean;
}

interface UseRelaxSuggestionsOptions {
  section: RelaxSection;
  location: GeolocationResult | null;
  isGeoLoading: boolean;
  hasHouseholdLocation: boolean;
  /** External gate for lazy-loading (e.g., only fetch when tab is visited) */
  enabled?: boolean;
  /** Server-side pre-fetched data passed as initial cache value */
  initialData?: RelaxSuggestionsResponse;
  /** Timestamp when initialData was generated (avoids treating it as immediately stale) */
  initialDataUpdatedAt?: number;
}

// ============================================
// Constants
// ============================================

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

// ============================================
// Helpers
// ============================================

function buildGeoBody(location: GeolocationResult | null): Record<string, unknown> {
  const hasGeo = !!(location && location.latitude !== 0 && location.longitude !== 0);
  if (!hasGeo || !location) return {};
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    city: location.city,
    country: location.country,
    timezone: location.timezone,
  };
}

/**
 * Module-level map so forceRefresh flags survive component unmount/remount.
 * Keyed by section to avoid cross-section leakage.
 */
const forceRefreshFlags = new Map<RelaxSection, boolean>();

function getForceRefreshRef(section: RelaxSection) {
  return {
    get current() {
      return forceRefreshFlags.get(section) ?? false;
    },
    set current(value: boolean) {
      forceRefreshFlags.set(section, value);
    },
  };
}

// ============================================
// Hook
// ============================================

/**
 * Query hook for a single Relax section.
 *
 * Data comes from cultural_events (written by the event ingestion pipeline).
 * - `staleTime: 15min` — data only changes when pipeline runs
 * - `gcTime: 30min` — keeps results in memory across navigation
 * - `refetchOnMount: false` — don't refetch if cache is fresh
 */
export function useRelaxSuggestions({
  section,
  location,
  isGeoLoading,
  hasHouseholdLocation,
  enabled: externalEnabled = true,
  initialData,
  initialDataUpdatedAt,
}: UseRelaxSuggestionsOptions) {
  const hasGeo = !!(location && location.latitude !== 0 && location.longitude !== 0);
  const isLocationReady = !isGeoLoading && (hasGeo || hasHouseholdLocation);
  const isEnabled = isLocationReady && externalEnabled;

  const locationRef = useRef(location);
  locationRef.current = location;

  const forceRefreshRef = getForceRefreshRef(section);

  const query = useQuery<RelaxSuggestionsResponse>({
    queryKey: queryKeys.relax.section(section),
    queryFn: () => {
      const shouldForce = forceRefreshRef.current;
      forceRefreshRef.current = false;

      const body: Record<string, unknown> = {
        section,
        ...buildGeoBody(locationRef.current),
        ...(shouldForce && { forceRefresh: true }),
      };
      return apiFetch<RelaxSuggestionsResponse>("/api/ai/relax-suggestions", {
        method: "POST",
        body,
      });
    },
    enabled: isEnabled,
    staleTime: FIFTEEN_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
    initialData,
    initialDataUpdatedAt,
    refetchOnMount: false,
  });

  return { ...query, forceRefreshRef };
}

/**
 * Returns a function that triggers the event ingestion pipeline and then re-fetches from DB.
 *
 * Flow: POST /api/events/refresh (runs pipeline) → invalidate query cache → re-fetch from DB.
 */
export function useRefreshRelaxSection() {
  const queryClient = useQueryClient();

  return useCallback(
    async (section: RelaxSection, forceRefreshRef: React.RefObject<boolean>) => {
      // 1. Trigger the ingestion pipeline
      await apiFetch<{ success: boolean; eventsStored: number }>("/api/events/refresh", {
        method: "POST",
      });

      // 2. Re-fetch from DB
      forceRefreshRef.current = true;
      return queryClient.invalidateQueries({
        queryKey: queryKeys.relax.section(section),
      });
    },
    [queryClient],
  );
}
