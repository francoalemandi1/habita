"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import type { GeolocationResult } from "@/hooks/use-geolocation";
import type { GroceryTab, GroceryAdvisorResult } from "@/lib/llm/grocery-advisor";

// ============================================
// Types
// ============================================

export interface GroceryDealsResponse extends GroceryAdvisorResult {
  cached?: boolean;
}

interface UseGroceryDealsOptions {
  category: GroceryTab;
  location: GeolocationResult | null;
  isGeoLoading: boolean;
  hasHouseholdLocation: boolean;
  aiEnabled: boolean;
  /** External gate for lazy-loading (only fetch when tab is visited) */
  enabled?: boolean;
  /** Server-side pre-fetched data */
  initialData?: GroceryDealsResponse;
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
 * Keyed by category to avoid cross-category leakage.
 */
const forceRefreshFlags = new Map<GroceryTab, boolean>();

function getForceRefreshRef(category: GroceryTab) {
  return {
    get current() {
      return forceRefreshFlags.get(category) ?? false;
    },
    set current(value: boolean) {
      forceRefreshFlags.set(category, value);
    },
  };
}

// ============================================
// Hook
// ============================================

/**
 * Query hook for grocery deals of a single category.
 *
 * - Gated by geolocation + AI enabled + external `enabled` flag
 * - `staleTime: 5min` — server has 24h DB cache
 * - `gcTime: 30min` — keeps results in memory across navigation
 */
export function useGroceryDeals({
  category,
  location,
  isGeoLoading,
  hasHouseholdLocation,
  aiEnabled,
  enabled: externalEnabled = true,
  initialData,
  initialDataUpdatedAt,
}: UseGroceryDealsOptions) {
  const hasGeo = !!(location && location.latitude !== 0 && location.longitude !== 0);
  const isLocationReady = !isGeoLoading && (hasGeo || hasHouseholdLocation);
  const isEnabled = aiEnabled && isLocationReady && externalEnabled;

  const locationRef = useRef(location);
  locationRef.current = location;

  const forceRefreshRef = getForceRefreshRef(category);

  const query = useQuery<GroceryDealsResponse>({
    queryKey: queryKeys.grocery.category(category),
    queryFn: () => {
      const shouldForce = forceRefreshRef.current;
      forceRefreshRef.current = false;

      const body: Record<string, unknown> = {
        category,
        ...buildGeoBody(locationRef.current),
        ...(shouldForce && { forceRefresh: true }),
      };
      return apiFetch<GroceryDealsResponse>("/api/ai/grocery-deals", {
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
 * Returns a function that force-refreshes a grocery category.
 */
export function useRefreshGroceryDeals() {
  const queryClient = useQueryClient();

  return useCallback(
    (category: GroceryTab, forceRefreshRef: React.RefObject<boolean>) => {
      forceRefreshRef.current = true;
      return queryClient.invalidateQueries({
        queryKey: queryKeys.grocery.category(category),
      });
    },
    [queryClient],
  );
}
