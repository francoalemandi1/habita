import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { findRunningPipeline } from "@/lib/promos/run-pipeline";

/**
 * GET /api/promos/pipeline-status
 *
 * Returns whether the promos pipeline is currently running for the household.
 * Used for polling: client checks every 3s while pipeline is active.
 */
export async function GET() {
  try {
    const member = await requireMember();

    const running = await findRunningPipeline(member.householdId);

    return NextResponse.json({
      isRunning: !!running,
      startedAt: running?.startedAt.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/promos/pipeline-status", method: "GET" });
  }
}
