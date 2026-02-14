"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import type { GeolocationResult } from "@/hooks/use-geolocation";
import type { ShoppingPlan } from "@/lib/llm/core/shopping-plan/types";

// ============================================
// Types
// ============================================

export type ShoppingPlanResponse = ShoppingPlan;

interface UseShoppingPlanOptions {
  location: GeolocationResult | null;
  isGeoLoading: boolean;
  hasHouseholdLocation: boolean;
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

/** Module-level flag so forceRefresh survives component unmount/remount. */
let forceRefreshFlag = false;

// ============================================
// Hook
// ============================================

/**
 * Query hook for the unified shopping plan.
 *
 * - Manual trigger: disabled by default, call `trigger()` to start
 * - `staleTime: 5min` — server has 24h DB cache per category
 * - `gcTime: 30min` — keeps result in memory across navigation
 */
export function useShoppingPlan({
  location,
  isGeoLoading,
  hasHouseholdLocation,
}: UseShoppingPlanOptions) {
  const hasGeo = !!(location && location.latitude !== 0 && location.longitude !== 0);
  const isLocationReady = !isGeoLoading && (hasGeo || hasHouseholdLocation);

  /** Whether the user has explicitly triggered the search */
  const [triggered, setTriggered] = useState(false);

  const isEnabled = isLocationReady && triggered;

  const locationRef = useRef(location);
  locationRef.current = location;

  const query = useQuery<ShoppingPlanResponse>({
    queryKey: queryKeys.grocery.shoppingPlan(),
    queryFn: () => {
      const shouldForce = forceRefreshFlag;
      forceRefreshFlag = false;

      const body: Record<string, unknown> = {
        ...buildGeoBody(locationRef.current),
        ...(shouldForce && { forceRefresh: true }),
      };
      return apiFetch<ShoppingPlanResponse>("/api/ai/shopping-plan", {
        method: "POST",
        body,
      });
    },
    enabled: isEnabled,
    staleTime: FIVE_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
    refetchOnMount: false,
  });

  /** Manually start the shopping plan search */
  const trigger = useCallback(() => {
    setTriggered(true);
  }, []);

  return { ...query, triggered, trigger };
}

/**
 * Returns a function that force-refreshes the shopping plan.
 */
export function useRefreshShoppingPlan() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    forceRefreshFlag = true;
    return queryClient.invalidateQueries({
      queryKey: queryKeys.grocery.shoppingPlan(),
    });
  }, [queryClient]);
}
