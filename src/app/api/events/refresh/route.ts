import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { runIngestPhase, runScorePhase } from "@/lib/events/pipeline/run-pipeline";

/** Score all newly ingested events after on-demand ingest. */
const ON_DEMAND_SCORE_LIMIT = 50;

/**
 * POST /api/events/refresh
 *
 * Triggers the event ingestion pipeline for the household's city.
 * Phase A: discover URLs + content via Tavily, extract, validate, persist.
 * Phase B: score newly ingested events (if any were created).
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

    const outcome = await runIngestPhase({ city, country });

    // Score newly ingested events if any were created
    if (outcome.eventsCreated > 0) {
      await runScorePhase({ limit: ON_DEMAND_SCORE_LIMIT });
    }

    return NextResponse.json({
      success: outcome.status !== "FAILED",
      eventsStored: outcome.eventsCreated,
      durationMs: outcome.durationMs,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/events/refresh", method: "POST" });
  }
}
