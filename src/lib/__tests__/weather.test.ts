import { describe, it, expect, vi, beforeEach } from "vitest";
import { getWeatherForecast } from "../weather";

import type { WeatherForecast } from "../weather";

// Buenos Aires coordinates for real API tests
const BA_LAT = -34.6037;
const BA_LON = -58.3816;

describe("getWeatherForecast", () => {
  describe("input validation", () => {
    it("returns null for null coordinates", async () => {
      expect(await getWeatherForecast(null, null)).toBeNull();
    });

    it("returns null for undefined coordinates", async () => {
      expect(await getWeatherForecast(undefined, undefined)).toBeNull();
    });

    it("returns null for mixed null/undefined", async () => {
      expect(await getWeatherForecast(BA_LAT, null)).toBeNull();
      expect(await getWeatherForecast(null, BA_LON)).toBeNull();
      expect(await getWeatherForecast(undefined, BA_LON)).toBeNull();
    });

    it("returns null for both coordinates being 0", async () => {
      expect(await getWeatherForecast(0, 0)).toBeNull();
    });

    it("allows latitude 0 with valid longitude (equator)", async () => {
      const result = await getWeatherForecast(0, BA_LON);
      // Should attempt the API call, not return null immediately
      // (0, non-zero) is a valid location on the equator
      expect(result).not.toBeNull();
    }, 10000);
  });

  describe("API integration (real Open-Meteo call)", () => {
    it("returns valid forecast for Buenos Aires", async () => {
      const forecast = await getWeatherForecast(BA_LAT, BA_LON);

      expect(forecast).not.toBeNull();
      const result = forecast as WeatherForecast;

      // Structure validation
      expect(result).toHaveProperty("today");
      expect(result).toHaveProperty("tomorrow");

      // Today properties
      expect(result.today).toHaveProperty("date");
      expect(result.today).toHaveProperty("temperatureMax");
      expect(result.today).toHaveProperty("temperatureMin");
      expect(result.today).toHaveProperty("precipitationProbability");
      expect(result.today).toHaveProperty("weatherDescription");

      // Tomorrow properties
      expect(result.tomorrow).toHaveProperty("date");
      expect(result.tomorrow).toHaveProperty("temperatureMax");
      expect(result.tomorrow).toHaveProperty("temperatureMin");
      expect(result.tomorrow).toHaveProperty("precipitationProbability");
      expect(result.tomorrow).toHaveProperty("weatherDescription");

      // Value range validation
      expect(result.today.temperatureMax).toBeGreaterThan(-50);
      expect(result.today.temperatureMax).toBeLessThan(60);
      expect(result.today.temperatureMin).toBeGreaterThan(-50);
      expect(result.today.temperatureMin).toBeLessThan(60);
      expect(result.today.precipitationProbability).toBeGreaterThanOrEqual(0);
      expect(result.today.precipitationProbability).toBeLessThanOrEqual(100);

      // Weather description should be a non-empty Spanish string
      expect(result.today.weatherDescription).toBeTruthy();
      expect(typeof result.today.weatherDescription).toBe("string");

      // Date format: YYYY-MM-DD
      expect(result.today.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.tomorrow.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }, 10000);

    it("returns valid forecast for Madrid (different hemisphere)", async () => {
      const forecast = await getWeatherForecast(40.4168, -3.7038);

      expect(forecast).not.toBeNull();
      const result = forecast as WeatherForecast;
      expect(result.today.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof result.today.weatherDescription).toBe("string");
    }, 10000);
  });

  describe("caching behavior", () => {
    it("returns cached result on second call with same coordinates", async () => {
      // First call - hits API
      const start1 = Date.now();
      const first = await getWeatherForecast(BA_LAT, BA_LON);
      const duration1 = Date.now() - start1;

      // Second call - should be nearly instant from cache
      const start2 = Date.now();
      const second = await getWeatherForecast(BA_LAT, BA_LON);
      const duration2 = Date.now() - start2;

      expect(first).toEqual(second);
      // Cache hit should be significantly faster (< 5ms vs potentially hundreds for API)
      expect(duration2).toBeLessThan(50);
    }, 10000);

    it("treats slightly different coordinates as same cache key (1 decimal rounding)", async () => {
      // Both round to -34.6:-58.4
      const first = await getWeatherForecast(-34.6037, -58.3816);
      const second = await getWeatherForecast(-34.6099, -58.3801);

      // Same cache key → same result object
      expect(first).toEqual(second);
    }, 10000);
  });

  describe("error handling", () => {
    it("returns null when fetch fails (mocked)", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      // Use coordinates far from previous tests to avoid cache
      const result = await getWeatherForecast(89.0, 179.0);
      expect(result).toBeNull();

      globalThis.fetch = originalFetch;
    });

    it("returns null when API returns non-ok status (mocked)", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      // Use unique coordinates to avoid cache
      const result = await getWeatherForecast(88.0, 178.0);
      expect(result).toBeNull();

      globalThis.fetch = originalFetch;
    });

    it("returns null when API response has missing daily data (mocked)", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ daily: {} }),
      });

      const result = await getWeatherForecast(87.0, 177.0);
      expect(result).toBeNull();

      globalThis.fetch = originalFetch;
    });
  });
});
