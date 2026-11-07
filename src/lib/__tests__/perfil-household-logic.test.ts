import { describe, expect, it } from "vitest";
import {
  OCCUPATION_LEVELS,
  formatLocationLabel,
  formatPlanningDayLabel,
  isOccupationLevel,
} from "@/lib/perfil-household-logic";

describe("formatPlanningDayLabel", () => {
  it("labels 'Sin día fijo' for null", () => {
    expect(formatPlanningDayLabel(null)).toBe("Sin día fijo");
  });

  it("labels each weekday", () => {
    expect(formatPlanningDayLabel(0)).toBe("Domingo");
    expect(formatPlanningDayLabel(1)).toBe("Lunes");
    expect(formatPlanningDayLabel(6)).toBe("Sábado");
  });
});

describe("formatLocationLabel", () => {
  it("joins city and country name", () => {
    expect(formatLocationLabel({ city: "Córdoba", country: "AR", timezone: null })).toBe("Córdoba, Argentina");
  });

  it("falls back to the country code when unmapped", () => {
    expect(formatLocationLabel({ city: "Montevideo", country: "UY", timezone: null })).toBe("Montevideo, UY");
  });

  it("falls back to the timezone when there is no city or country", () => {
    expect(formatLocationLabel({ city: null, country: null, timezone: "America/Argentina/Cordoba" })).toBe(
      "America/Argentina/Cordoba",
    );
  });

  it("falls back to 'Sin configurar' when nothing is set", () => {
    expect(formatLocationLabel({ city: null, country: null, timezone: null })).toBe("Sin configurar");
  });
});

describe("isOccupationLevel", () => {
  it("accepts every known level", () => {
    for (const level of OCCUPATION_LEVELS) {
      expect(isOccupationLevel(level.value)).toBe(true);
    }
  });

  it("rejects an unknown value", () => {
    expect(isOccupationLevel("UNKNOWN")).toBe(false);
  });
});
