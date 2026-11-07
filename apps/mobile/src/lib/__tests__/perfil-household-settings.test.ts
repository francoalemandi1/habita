import { describe, expect, it } from "vitest";
import { parseHouseholdSettings } from "../perfil-household-settings";

describe("parseHouseholdSettings", () => {
  it("extracts city, timezone and planningDay from a household row", () => {
    const result = parseHouseholdSettings({ city: "Córdoba", timezone: "America/Argentina/Cordoba", planningDay: 1 });

    expect(result).toEqual({ city: "Córdoba", timezone: "America/Argentina/Cordoba", planningDay: 1 });
  });

  it("defaults missing fields to null", () => {
    const result = parseHouseholdSettings({});

    expect(result).toEqual({ city: null, timezone: null, planningDay: null });
  });

  it("falls back to null for a household that fails to parse", () => {
    const result = parseHouseholdSettings(null);

    expect(result).toEqual({ city: null, timezone: null, planningDay: null });
  });
});
