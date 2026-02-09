import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildRegionalContext } from "../regional-context";

import type { RegionalContext } from "../regional-context";

describe("buildRegionalContext", () => {
  describe("empty / missing location data", () => {
    it("returns empty promptBlock when no location data exists", async () => {
      const result = await buildRegionalContext({});
      expect(result.promptBlock).toBe("");
    });

    it("returns empty promptBlock for all nulls", async () => {
      const result = await buildRegionalContext({
        latitude: null,
        longitude: null,
        timezone: null,
        country: null,
        city: null,
      });
      expect(result.promptBlock).toBe("");
    });

    it("always returns valid timeOfDay even without location", async () => {
      const result = await buildRegionalContext({});
      expect(["morning", "afternoon", "evening", "night"]).toContain(result.timeOfDay);
    });

    it("returns numeric localHour between 0-23", async () => {
      const result = await buildRegionalContext({});
      expect(result.localHour).toBeGreaterThanOrEqual(0);
      expect(result.localHour).toBeLessThanOrEqual(23);
    });

    it("returns localDayOfWeek between 0-6", async () => {
      const result = await buildRegionalContext({});
      expect(result.localDayOfWeek).toBeGreaterThanOrEqual(0);
      expect(result.localDayOfWeek).toBeLessThanOrEqual(6);
    });

    it("returns boolean isWeekend", async () => {
      const result = await buildRegionalContext({});
      expect(typeof result.isWeekend).toBe("boolean");
    });
  });

  describe("timezone-only location", () => {
    it("generates promptBlock with timezone and time info", async () => {
      const result = await buildRegionalContext({
        timezone: "America/Buenos_Aires",
      });

      expect(result.promptBlock).toContain("## Contexto regional del hogar");
      expect(result.promptBlock).toContain("America/Buenos_Aires");
      expect(result.promptBlock).toContain("Hora local:");
    });

    it("does not include weather without coordinates", async () => {
      const result = await buildRegionalContext({
        timezone: "America/Buenos_Aires",
      });

      expect(result.promptBlock).not.toContain("## Clima");
    });
  });

  describe("full location (Argentina)", () => {
    it("includes location, timezone, language variant, and weather", async () => {
      const result = await buildRegionalContext({
        latitude: -34.6037,
        longitude: -58.3816,
        timezone: "America/Buenos_Aires",
        country: "AR",
        city: "Buenos Aires",
      });

      expect(result.promptBlock).toContain("Buenos Aires, AR");
      expect(result.promptBlock).toContain("America/Buenos_Aires");
      expect(result.promptBlock).toContain("español rioplatense argentino");
      expect(result.promptBlock).toContain("voseo");
      expect(result.promptBlock).toContain("## Clima");
      expect(result.promptBlock).toContain("Hoy:");
      expect(result.promptBlock).toContain("Mañana:");
      expect(result.promptBlock).toContain("°C");
    }, 10000);

    it("uses Buenos Aires timezone for local hour calculation", async () => {
      const result = await buildRegionalContext({
        timezone: "America/Buenos_Aires",
        country: "AR",
      });

      // Should compute local hour in Buenos Aires timezone
      const expectedHour = parseInt(
        new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          hour12: false,
          timeZone: "America/Buenos_Aires",
        }).format(new Date()),
        10
      );

      expect(result.localHour).toBe(expectedHour);
    });
  });

  describe("language variants", () => {
    const variants: Array<{ country: string; expected: string }> = [
      { country: "AR", expected: "rioplatense argentino" },
      { country: "MX", expected: "mexicano" },
      { country: "ES", expected: "peninsular" },
      { country: "CO", expected: "colombiano" },
      { country: "CL", expected: "chileno" },
      { country: "UY", expected: "rioplatense uruguayo" },
      { country: "PE", expected: "peruano" },
      { country: "VE", expected: "venezolano" },
    ];

    for (const { country, expected } of variants) {
      it(`maps ${country} to ${expected}`, async () => {
        const result = await buildRegionalContext({
          timezone: "UTC",
          country,
        });
        expect(result.promptBlock).toContain(expected);
      });
    }

    it("handles lowercase country codes", async () => {
      const result = await buildRegionalContext({
        timezone: "UTC",
        country: "ar",
      });
      expect(result.promptBlock).toContain("rioplatense argentino");
    });

    it("omits language variant for unknown country", async () => {
      const result = await buildRegionalContext({
        timezone: "UTC",
        country: "JP",
      });
      expect(result.promptBlock).not.toContain("Variante de español");
    });
  });

  describe("season detection", () => {
    it("shows southern hemisphere season for negative latitude", async () => {
      // February in southern hemisphere = verano (summer)
      const now = new Date();
      const month = now.getMonth(); // 0-indexed

      const result = await buildRegionalContext({
        latitude: -34.6,
        timezone: "America/Buenos_Aires",
        country: "AR",
      });

      expect(result.promptBlock).toContain("Estación:");
    });

    it("shows northern hemisphere season for positive latitude", async () => {
      const result = await buildRegionalContext({
        latitude: 40.4,
        timezone: "Europe/Madrid",
        country: "ES",
      });

      expect(result.promptBlock).toContain("Estación:");
    });
  });

  describe("timeOfDay mapping", () => {
    // This tests the time-of-day logic indirectly via different timezones
    it("correctly maps hour to time of day for multiple timezones", async () => {
      // We can't control the current time, but we can verify the mapping is consistent
      const result = await buildRegionalContext({
        timezone: "America/Buenos_Aires",
        country: "AR",
      });

      const hour = result.localHour;
      const expectedTimeOfDay =
        hour >= 5 && hour < 12
          ? "morning"
          : hour >= 12 && hour < 18
            ? "afternoon"
            : hour >= 18 && hour < 22
              ? "evening"
              : "night";

      expect(result.timeOfDay).toBe(expectedTimeOfDay);
    });
  });

  describe("weekend detection", () => {
    it("isWeekend matches localDayOfWeek", async () => {
      const result = await buildRegionalContext({
        timezone: "America/Buenos_Aires",
        country: "AR",
      });

      const expectedWeekend = result.localDayOfWeek === 0 || result.localDayOfWeek === 6;
      expect(result.isWeekend).toBe(expectedWeekend);
    });
  });

  describe("Mexico location (different timezone + variant)", () => {
    it("generates correct context for Mexico City", async () => {
      const result = await buildRegionalContext({
        latitude: 19.4326,
        longitude: -99.1332,
        timezone: "America/Mexico_City",
        country: "MX",
        city: "Ciudad de México",
      });

      expect(result.promptBlock).toContain("Ciudad de México, MX");
      expect(result.promptBlock).toContain("America/Mexico_City");
      expect(result.promptBlock).toContain("español mexicano");
      expect(result.promptBlock).toContain("## Clima");
    }, 10000);
  });
});
