import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

/**
 * Legacy compat stub — only reached by app builds from before the rebrand
 * that still call /api/saved-items/recipes. The feature was removed on
 * HEAD; this stub keeps the cocina screen on those old builds from
 * crashing (empty list) and surfaces a clear error on save/delete. Safe to
 * delete once the store listing points to a build without these calls.
 */

/**
 * GET /api/saved-items/recipes
 * The old screen renders an empty saved-recipes list, not an error state.
 */
export async function GET() {
  try {
    await requireMember();

    return NextResponse.json([]);
  } catch (error) {
    return handleApiError(error, { route: "/api/saved-items/recipes", method: "GET" });
  }
}

/**
 * POST /api/saved-items/recipes
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
    return handleApiError(error, { route: "/api/saved-items/recipes", method: "POST" });
  }
}

/**
 * DELETE /api/saved-items/recipes
 * Unreachable in practice since GET always returns an empty list, but
 * stubbed for completeness and consistency with POST.
 */
export async function DELETE() {
  try {
    await requireMember();

    return NextResponse.json(
      { error: "Esta función ya no está disponible. Actualizá la app.", code: "feature_removed" },
      { status: 410 },
    );
  } catch (error) {
    return handleApiError(error, { route: "/api/saved-items/recipes", method: "DELETE" });
  }
}
