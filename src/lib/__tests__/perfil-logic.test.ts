import { describe, expect, it } from "vitest";
import {
  MEMBER_TYPE_LABELS,
  describeLeaveHouseholdError,
  resolveAfterLeaveRoute,
} from "@/lib/perfil-logic";

describe("MEMBER_TYPE_LABELS", () => {
  it("labels every member type in Spanish", () => {
    expect(MEMBER_TYPE_LABELS.ADULT).toBe("Adulto");
    expect(MEMBER_TYPE_LABELS.TEEN).toBe("Adolescente");
    expect(MEMBER_TYPE_LABELS.CHILD).toBe("Niño/a");
  });
});

describe("describeLeaveHouseholdError", () => {
  it("explains the LAST_ADULT guard", () => {
    expect(describeLeaveHouseholdError("LAST_ADULT")).toBe(
      "Sos el único adulto activo de la casa. Antes de salir, sumá a otro adulto.",
    );
  });

  it("asks to retry for LEAVE_CONFLICT", () => {
    expect(describeLeaveHouseholdError("LEAVE_CONFLICT")).toBe("No se pudo salir, probá de nuevo");
  });

  it("falls back to the retry copy for unknown codes", () => {
    expect(describeLeaveHouseholdError(undefined)).toBe("No se pudo salir, probá de nuevo");
  });
});

describe("resolveAfterLeaveRoute", () => {
  it("switches household when another one exists", () => {
    expect(resolveAfterLeaveRoute("household-2")).toEqual({ action: "switch", householdId: "household-2" });
  });

  it("sends the member to onboarding when no household remains", () => {
    expect(resolveAfterLeaveRoute(null)).toEqual({ action: "onboarding" });
  });
});
