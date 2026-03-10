import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runPipeline } from "@/lib/events/pipeline/run-pipeline";
import { findRunningPipeline } from "@/lib/events/pipeline/persistence";
import { ensureCulturalCity } from "@/lib/events/city-normalizer";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

export const maxDuration = 300;

// ============================================
// POST /api/cron/events/ingest
//
// No ?city  → DISCOVERY MODE: discover cities from households, trigger each
// ?city=X   → SINGLE-CITY MODE: run pipeline for that city
// ============================================

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function discoverActiveCities(): Promise<string[]> {
  const rows = await prisma.household.findMany({
    where: { city: { not: null } },
    select: { city: true },
    distinct: ["city"],
  });
  return rows.map((r) => r.city).filter((c): c is string => c !== null);
}

export async function POST(request: NextRequest) {
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

  try {
    const city = request.nextUrl.searchParams.get("city");
    const country = request.nextUrl.searchParams.get("country") ?? "AR";

    // ── SINGLE-CITY MODE ──────────────────────────────────────────────
    if (city) {
      const running = await findRunningPipeline(city);
      if (running) {
        return NextResponse.json({
          skipped: true,
          reason: "Pipeline already running for this city",
          city,
        });
      }

      const outcome = await runPipeline({ city, country });

      return NextResponse.json({
        success: outcome.status !== "FAILED",
        outcome,
        timestamp: new Date().toISOString(),
      });
    }

    // ── DISCOVERY MODE ────────────────────────────────────────────────
    const cities = await discoverActiveCities();

    if (cities.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active cities found in households",
        cities: [],
      });
    }

    // Ensure CulturalCity rows exist for all discovered cities
    for (const cityName of cities) {
      await ensureCulturalCity(cityName);
    }

    const baseUrl = getBaseUrl();

    // Fire self-invocations in background (each gets its own serverless budget)
    after(async () => {
      for (const cityName of cities) {
        try {
          await fetch(
            `${baseUrl}/api/cron/events/ingest?city=${encodeURIComponent(cityName)}&country=${country}`,
            {
              method: "POST",
              headers: { authorization: `Bearer ${cronSecret}` },
            },
          );
        } catch (err) {
          console.error(`[events-cron] Failed to trigger pipeline for ${cityName}:`, err);
        }
        // Small delay between invocations to avoid thundering herd
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    });

    return NextResponse.json({
      success: true,
      mode: "discovery",
      citiesTriggered: cities,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/cron/events/ingest", method: "POST" });
  }
}
