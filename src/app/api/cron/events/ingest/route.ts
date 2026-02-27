import { NextResponse } from "next/server";
import { runIngestPhase, runScorePhase } from "@/lib/events/pipeline/run-pipeline";

import type { NextRequest } from "next/server";

// ============================================
// POST /api/cron/events/ingest
//
// Query params:
//   ?phase=ingest&city=Córdoba  → Phase A (discover + crawl + extract + persist)
//   ?phase=score                → Phase B (score unscored events + rank)
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 1. Validate CRON_SECRET
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 503 },
      );
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. Determine which phase to run
    const phase = request.nextUrl.searchParams.get("phase") ?? "ingest";

    if (phase === "score") {
      const result = await runScorePhase();
      return NextResponse.json({
        success: true,
        phase: "score",
        scored: result.scored,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      });
    }

    // Phase A: ingest
    const city = request.nextUrl.searchParams.get("city");
    if (!city) {
      return NextResponse.json(
        { error: "Missing required query param: city" },
        { status: 400 },
      );
    }

    const country = request.nextUrl.searchParams.get("country") ?? "AR";

    const outcome = await runIngestPhase({ city, country });

    return NextResponse.json({
      success: outcome.status !== "FAILED",
      phase: "ingest",
      outcome,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/cron/events/ingest error:", error);
    return NextResponse.json(
      { error: "Error processing event ingestion" },
      { status: 500 },
    );
  }
}
