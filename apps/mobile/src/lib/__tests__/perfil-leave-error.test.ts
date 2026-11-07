import { describe, expect, it } from "vitest";
import { ApiError } from "@habita/api-client";
import { getLeaveHouseholdErrorMessage } from "../perfil-leave-error";

describe("getLeaveHouseholdErrorMessage", () => {
  it("returns the last-adult copy for LAST_ADULT", () => {
    const error = new ApiError("Sos el único adulto activo del hogar, todavía no podés salir", 409, "LAST_ADULT");

    expect(getLeaveHouseholdErrorMessage(error)).toBe(
      "Sos el único adulto activo de la casa. Antes de salir, sumá a otro adulto.",
    );
  });

  it("returns the retry copy for LEAVE_CONFLICT", () => {
    const error = new ApiError("conflict", 409, "LEAVE_CONFLICT");

    expect(getLeaveHouseholdErrorMessage(error)).toBe("No se pudo salir, probá de nuevo");
  });

  it("falls back to the generic mobile error message for other errors", () => {
    const error = new ApiError("Algo específico salió mal", 400);

    expect(getLeaveHouseholdErrorMessage(error)).toBe("Algo específico salió mal");
  });
});
