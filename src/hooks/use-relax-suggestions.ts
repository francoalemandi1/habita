"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import type { GeolocationResult } from "@/hooks/use-geolocation";
import type { RelaxEvent, RelaxSection } from "@/lib/llm/relax-finder";

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
  aiEnabled: boolean;
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

const FIVE_MINUTES_MS = 5 * 60 * 1000;
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
 * - Gated by geolocation readiness + AI enabled + external `enabled` flag
 * - `staleTime: 5min` — server has 24h DB cache, this prevents redundant network calls
 * - `gcTime: 30min` — keeps results in memory across navigation
 * - `refetchOnMount: false` — don't refetch if cache is fresh when user navigates back
 *
 * When `forceRefreshRef.current` is set, the next queryFn call sends `forceRefresh: true`
 * to bypass the server-side DB cache (used by the "Actualizar" button).
 */
export function useRelaxSuggestions({
  section,
  location,
  isGeoLoading,
  hasHouseholdLocation,
  aiEnabled,
  enabled: externalEnabled = true,
  initialData,
  initialDataUpdatedAt,
}: UseRelaxSuggestionsOptions) {
  const hasGeo = !!(location && location.latitude !== 0 && location.longitude !== 0);
  const isLocationReady = !isGeoLoading && (hasGeo || hasHouseholdLocation);
  const isEnabled = aiEnabled && isLocationReady && externalEnabled;

  // Ref so queryFn can read latest location without causing re-renders
  const locationRef = useRef(location);
  locationRef.current = location;

  // Module-level flag that survives unmount/remount — signals forceRefresh to the queryFn
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
    staleTime: FIVE_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
    initialData,
    initialDataUpdatedAt,
    refetchOnMount: false,
  });

  return { ...query, forceRefreshRef };
}

/**
 * Returns a function that force-refreshes a Relax section.
 *
 * Uses `invalidateQueries` which triggers the existing `useQuery`'s `queryFn`,
 * keeping `isFetching`, `error`, and `data` state in sync automatically.
 * The `forceRefreshRef` flag signals the `queryFn` to send `forceRefresh: true`
 * to bypass the server-side DB cache.
 */
export function useRefreshRelaxSection() {
  const queryClient = useQueryClient();

  return useCallback(
    (section: RelaxSection, forceRefreshRef: React.RefObject<boolean>) => {
      forceRefreshRef.current = true;
      return queryClient.invalidateQueries({
        queryKey: queryKeys.relax.section(section),
      });
    },
    [queryClient],
  );
}
