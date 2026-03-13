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

/** Skip cities with fewer active members than this threshold */
const MIN_MEMBERS_FOR_PIPELINE = 3;

/** Skip cities whose last successful pipeline run was less than this many hours ago */
const EVENT_PIPELINE_FRESHNESS_HOURS = 72;

/** Cities with fewer members than this use compact (fewer) Tavily queries */
const COMPACT_QUERY_THRESHOLD = 15;

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Discover cities worth running the pipeline for:
 * 1. Must have at least MIN_MEMBERS_FOR_PIPELINE active members across all households
 * 2. Must not have a successful pipeline run within EVENT_PIPELINE_FRESHNESS_HOURS
 */
interface CityWithSize {
  city: string;
  memberCount: number;
}

async function discoverActiveCities(): Promise<CityWithSize[]> {
  // Step 1: Find cities with enough active members
  const households = await prisma.household.findMany({
    where: {
      city: { not: null },
      members: { some: { isActive: true } },
    },
    select: {
      city: true,
      _count: { select: { members: { where: { isActive: true } } } },
    },
  });

  // Aggregate member counts per city
  const cityMemberCounts = new Map<string, number>();
  for (const h of households) {
    if (!h.city) continue;
    cityMemberCounts.set(h.city, (cityMemberCounts.get(h.city) ?? 0) + h._count.members);
  }

  const eligibleCities = [...cityMemberCounts.entries()]
    .filter(([, count]) => count >= MIN_MEMBERS_FOR_PIPELINE)
    .map(([city, memberCount]) => ({ city, memberCount }));

  if (eligibleCities.length === 0) return [];

  // Step 2: Filter out cities with recent successful runs
  const freshnessCutoff = new Date(Date.now() - EVENT_PIPELINE_FRESHNESS_HOURS * 60 * 60 * 1000);
  const cityNames = eligibleCities.map((c) => c.city);

  const recentSuccesses = await prisma.eventIngestionLog.findMany({
    where: {
      city: { in: cityNames },
      status: "SUCCESS",
      createdAt: { gte: freshnessCutoff },
    },
    select: { city: true },
    distinct: ["city"],
  });

  const freshCities = new Set(recentSuccesses.map((r) => r.city).filter(Boolean));

  const citiesToProcess = eligibleCities.filter((c) => !freshCities.has(c.city));

  console.log(
    `[events-cron] Discovery: ${cityMemberCounts.size} cities total, ` +
    `${eligibleCities.length} with ≥${MIN_MEMBERS_FOR_PIPELINE} members, ` +
    `${freshCities.size} skipped (fresh), ${citiesToProcess.length} to process ` +
    `(${citiesToProcess.filter((c) => c.memberCount < COMPACT_QUERY_THRESHOLD).length} compact)`,
  );

  return citiesToProcess;
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
    const compact = request.nextUrl.searchParams.get("compact") === "true";

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

      const outcome = await runPipeline({ city, country, compact });

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
    for (const { city: cityName } of cities) {
      await ensureCulturalCity(cityName);
    }

    const baseUrl = getBaseUrl();

    // Fire self-invocations in background (each gets its own serverless budget)
    after(async () => {
      for (const { city: cityName, memberCount } of cities) {
        try {
          const useCompact = memberCount < COMPACT_QUERY_THRESHOLD;
          const params = new URLSearchParams({
            city: cityName,
            country,
            ...(useCompact && { compact: "true" }),
          });
          await fetch(
            `${baseUrl}/api/cron/events/ingest?${params.toString()}`,
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
      citiesTriggered: cities.map((c) => c.city),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/cron/events/ingest", method: "POST" });
  }
}
