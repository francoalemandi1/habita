import { NextResponse, after } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { runPromosPipeline, markPipelineRunning, findRunningPipeline } from "@/lib/promos/run-pipeline";
import { applyRateLimit } from "@/lib/rate-limit";

import type { NextRequest } from "next/server";

/**
 * POST /api/promos/refresh
 *
 * Triggers the promos pipeline for the household.
 * Fire-and-forget: returns immediately, pipeline runs in background via after().
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    const limited = await applyRateLimit(request, "ai", member.id);
    if (limited) return limited;

    const { householdId } = member;

    // Prevent duplicate concurrent runs
    const existing = await findRunningPipeline(householdId);
    if (existing) {
      return NextResponse.json({
        started: false,
        alreadyRunning: true,
        startedAt: existing.startedAt.toISOString(),
      });
    }

    // Create RUNNING log entry
    const logId = await markPipelineRunning(householdId);

    // Schedule background work
    after(async () => {
      await runPromosPipeline({ householdId, runningLogId: logId });
    });

    return NextResponse.json({
      started: true,
      alreadyRunning: false,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/promos/refresh", method: "POST" });
  }
}
