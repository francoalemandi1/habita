import { NextResponse, after } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { runPipeline } from "@/lib/events/pipeline/run-pipeline";
import {
  markPipelineRunning,
  findRunningPipeline,
  getOrCreatePipelineSource,
} from "@/lib/events/pipeline/persistence";

/**
 * POST /api/events/refresh
 *
 * Triggers the full event pipeline for the household's city.
 * Fire-and-forget: returns immediately, pipeline runs in background via after().
 */
export async function POST() {
  try {
    const member = await requireMember();
    const city = member.household.city;
    const country = member.household.country ?? "AR";

    if (!city) {
      return NextResponse.json(
        { error: "No se pudo determinar la ubicación. Configurá la ubicación del hogar." },
        { status: 400 },
      );
    }

    // Prevent duplicate concurrent runs for the same city
    const existing = await findRunningPipeline(city);
    if (existing) {
      return NextResponse.json({
        started: false,
        alreadyRunning: true,
        startedAt: existing.startedAt?.toISOString() ?? null,
      });
    }

    // Create RUNNING log entry
    const source = await getOrCreatePipelineSource();
    const logId = await markPipelineRunning(source.id, city);

    // Schedule background work — runs even if client disconnects
    after(async () => {
      await runPipeline({ city, country, runningLogId: logId });
    });

    return NextResponse.json({
      started: true,
      alreadyRunning: false,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/events/refresh", method: "POST" });
  }
}
