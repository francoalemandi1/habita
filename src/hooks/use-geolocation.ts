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
}

/**
 * Hook that silently requests browser geolocation and reverse geocodes via Open-Meteo.
 * Always captures timezone via Intl API even if geolocation is denied.
 */
export function useGeolocation() {
  const [location, setLocation] = useState<GeolocationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (!navigator.geolocation) {
      setLocation({ latitude: 0, longitude: 0, timezone: browserTimezone, country: "", city: "" });
      setError("geolocation_unavailable");
      setIsLoading(false);
      return;
    }

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
            city = data.locality || data.city || "";
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
  }, []);

  return { location, isLoading, error };
}
