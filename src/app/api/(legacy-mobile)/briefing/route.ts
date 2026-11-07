import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

/** Shape of the old `@habita/contracts` BriefingResponse, removed on HEAD. */
interface LegacyBriefingResponse {
  greeting: string;
  summary: string;
  highlights: string[];
  suggestion: string;
}

/**
 * Legacy compat stub — only reached by app builds from before the rebrand
 * that still call GET /api/briefing. The feature was removed on HEAD; this
 * stub keeps the dashboard screen on those old builds from crashing. Safe
 * to delete once the store listing points to a build without this call.
 *
 * GET /api/briefing
 * The old dashboard only reads `briefing.suggestion` to show an optional
 * tip card, so an empty suggestion renders nothing (not an error state).
 */
export async function GET() {
  try {
    await requireMember();

    const response: LegacyBriefingResponse = {
      greeting: "",
      summary: "",
      highlights: [],
      suggestion: "",
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: "/api/briefing", method: "GET" });
  }
}
