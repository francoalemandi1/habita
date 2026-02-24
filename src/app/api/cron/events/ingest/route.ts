import { NextResponse } from "next/server";
import { runIngestion, pickNextDueSource } from "@/lib/events/ingestion-orchestrator";

import type { NextRequest } from "next/server";

// ============================================
// POST /api/cron/events/ingest
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 1. Validate CRON_SECRET
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 503 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Determine which provider to run
    const providerParam = request.nextUrl.searchParams.get("provider");
    const sourceName = providerParam ?? await pickNextDueSource();

    if (!sourceName) {
      return NextResponse.json({
        success: true,
        message: "No active providers found for ingestion",
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Run ingestion
    const outcome = await runIngestion(sourceName);

    return NextResponse.json({
      success: outcome.status !== "FAILED",
      outcome,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/cron/events/ingest error:", error);
    return NextResponse.json(
      { error: "Error processing event ingestion" },
      { status: 500 }
    );
  }
}
