"use client";

import { useState, useEffect } from "react";

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  timezone: string;
  country: string;
  city: string;
}

interface ReverseGeocodeResult {
  countryCode?: string;
  city?: string;
  locality?: string;
  principalSubdivision?: string;
}

/**
 * BigDataCloud returns administrative divisions in `city` for most Argentine cities
 * (e.g. "Departamento Capital", "Partido de La Plata", "Departamento Rosario").
 * We detect these patterns and prefer `locality` which has the actual city name.
 */
const ADMIN_DIVISION_PATTERN = /^(departamento|partido)\b/i;

/**
 * Hook that silently requests browser geolocation and reverse geocodes via Open-Meteo.
 * Always captures timezone via Intl API even if geolocation is denied.
 */
export function useGeolocation() {
  const hasGeolocation = typeof navigator !== "undefined" && !!navigator.geolocation;
  const browserTimezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "America/Argentina/Buenos_Aires";

  const [location, setLocation] = useState<GeolocationResult | null>(() =>
    !hasGeolocation
      ? { latitude: 0, longitude: 0, timezone: browserTimezone, country: "", city: "" }
      : null,
  );
  const [isLoading, setIsLoading] = useState(hasGeolocation);
  const [error, setError] = useState<string | null>(() =>
    !hasGeolocation ? "geolocation_unavailable" : null,
  );

  useEffect(() => {
    if (!hasGeolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let country = "";
        let city = "";

        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`
          );
          if (response.ok) {
            const data = (await response.json()) as ReverseGeocodeResult;
            country = data.countryCode ?? "";
            const rawCity = data.city ?? "";
            city = ADMIN_DIVISION_PATTERN.test(rawCity)
              ? data.locality || data.principalSubdivision || rawCity
              : rawCity || data.locality || "";
          }
        } catch {
          // Reverse geocode failed — still save coordinates and timezone
        }

        setLocation({ latitude, longitude, timezone: browserTimezone, country, city });
        setIsLoading(false);
      },
      () => {
        // Permission denied — still capture timezone
        setLocation({ latitude: 0, longitude: 0, timezone: browserTimezone, country: "", city: "" });
        setError("permission_denied");
        setIsLoading(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, [hasGeolocation, browserTimezone]);

  return { location, isLoading, error };
}
