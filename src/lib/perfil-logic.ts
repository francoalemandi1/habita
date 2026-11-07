import type { MemberType } from "@prisma/client";

/** §5.3 Perfil — role label shown next to each household member. */
export const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  ADULT: "Adulto",
  TEEN: "Adolescente",
  CHILD: "Niño/a",
};

export type LeaveHouseholdErrorCode = "LAST_ADULT" | "LEAVE_CONFLICT";

/** Maps POST /api/members/me/leave error codes to the copy shown inside the leave dialog. */
export function describeLeaveHouseholdError(code: string | undefined): string {
  if (code === "LAST_ADULT") {
    return "Sos el único adulto activo de la casa. Antes de salir, sumá a otro adulto.";
  }
  return "No se pudo salir, probá de nuevo";
}

export type AfterLeaveRoute = { action: "switch"; householdId: string } | { action: "onboarding" };

/** Where to send the member after a successful leave, per the leave response's nextHouseholdId. */
export function resolveAfterLeaveRoute(nextHouseholdId: string | null): AfterLeaveRoute {
  return nextHouseholdId ? { action: "switch", householdId: nextHouseholdId } : { action: "onboarding" };
}
