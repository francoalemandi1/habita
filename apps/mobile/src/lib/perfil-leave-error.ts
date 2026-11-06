import { ApiError } from "@habita/api-client";
import { getMobileErrorMessage } from "./mobile-error";

const LAST_ADULT_MESSAGE =
  "Sos el único adulto activo de la casa. Antes de salir, sumá a otro adulto.";
const LEAVE_CONFLICT_MESSAGE = "No se pudo salir, probá de nuevo";

/** Maps POST /api/members/me/leave error codes to the copy from the handoff (§5.3 Perfil). */
export function getLeaveHouseholdErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "LAST_ADULT") return LAST_ADULT_MESSAGE;
    if (error.code === "LEAVE_CONFLICT") return LEAVE_CONFLICT_MESSAGE;
  }
  return getMobileErrorMessage(error);
}
