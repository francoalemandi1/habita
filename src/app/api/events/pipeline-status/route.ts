import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { findRunningPipeline } from "@/lib/events/pipeline/persistence";

/**
 * GET /api/events/pipeline-status
 *
 * Returns whether the event pipeline is currently running for the user's city.
 * Used for polling: client checks every N seconds to restore "Buscando eventos..." state.
 */
export async function GET() {
  try {
    const member = await requireMember();
    const city = member.household.city;

    if (!city) {
      return NextResponse.json({ isRunning: false, startedAt: null });
    }

    const running = await findRunningPipeline(city);

    return NextResponse.json({
      isRunning: !!running,
      startedAt: running?.startedAt?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/events/pipeline-status", method: "GET" });
  }
}
