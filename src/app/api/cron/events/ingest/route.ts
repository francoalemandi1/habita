import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/events/pipeline/run-pipeline";

import type { NextRequest } from "next/server";

// ============================================
// POST /api/cron/events/ingest
//
// Query params:
//   ?city=Córdoba  → Run full pipeline (discover → extract → curate → persist)
// ============================================

export async function POST(request: NextRequest) {
  try {
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

    const city = request.nextUrl.searchParams.get("city");
    if (!city) {
      return NextResponse.json(
        { error: "Missing required query param: city" },
        { status: 400 },
      );
    }

    const country = request.nextUrl.searchParams.get("country") ?? "AR";

    const outcome = await runPipeline({ city, country });

    return NextResponse.json({
      success: outcome.status !== "FAILED",
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
