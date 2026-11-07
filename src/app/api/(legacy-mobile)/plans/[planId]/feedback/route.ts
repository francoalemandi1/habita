import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

/**
 * Legacy compat stub — only reached by app builds from before the rebrand
 * that still call POST /api/plans/[planId]/feedback. The feature was
 * removed on HEAD; this stub returns a user-facing error instead of a
 * crash on those old builds. Safe to delete once the store listing points
 * to a build without this call.
 *
 * POST /api/plans/[planId]/feedback
 * `error` reaches the user as-is through the mobile API client's error
 * message parsing.
 */
export async function POST() {
  try {
    await requireMember();

    return NextResponse.json(
      { error: "Esta función ya no está disponible. Actualizá la app.", code: "feature_removed" },
      { status: 410 },
    );
  } catch (error) {
    return handleApiError(error, { route: "/api/plans/[planId]/feedback", method: "POST" });
  }
}
