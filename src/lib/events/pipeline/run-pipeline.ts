/**
 * Pipeline orchestrator — wires all stages together.
 *
 * Phase A (Ingest): Tavily (URLs + markdown) → filter → DeepSeek extract → validate → yield → dedup → persist
 * Phase B (Score): fetch unscored → DeepSeek score → rank → update DB
 */

import { prisma } from "@/lib/prisma";
import { extractDomain } from "@/lib/web-search";
import { discoverUrls } from "./discover-urls";
import { filterDomains } from "./domain-filter";
import { extractEventsFromPages } from "./extract-events";
import { validateEvents } from "./validate-events";
import { enforceSourceYield } from "./source-yield";
import { scoreEvents } from "./score-events";
import { rankAndDiversify } from "./rank-events";
import {
  processEvent,
  detectCategory,
  updateSourceHealth,
  logIngestion,
  buildOutcome,
} from "./persistence";

import type { IngestionOutcome, RawEventData } from "../types";
import type { ValidatedEvent, CrawledPage, SourceYieldReport } from "./types";
import type { EventToScore } from "./score-events";
import type { RankableEvent } from "./rank-events";

// ============================================
// Constants
// ============================================

const PIPELINE_SOURCE_NAME = "external-pipeline";

// ============================================
// Phase A: Ingest
// ============================================

interface IngestOptions {
  city: string;
  country: string;
}

/**
 * Phase A: Discover URLs, crawl, extract, validate, and persist events.
 * Events are persisted with culturalScore = null (Phase B scores them).
 */
export async function runIngestPhase(options: IngestOptions): Promise<IngestionOutcome> {
  const startTime = Date.now();
  const { city, country } = options;

  // Load or create the pipeline source
  const source = await getOrCreatePipelineSource();

  try {
    console.log(`[pipeline] Phase A: ingesting events for ${city}, ${country}`);
    const stageTimings: Record<string, number> = {};
    let stageStart = Date.now();

    // Stage 1: Discover URLs + content via Tavily (includeRawContent: "markdown")
    const discoveredUrls = await discoverUrls(city, country);
    stageTimings["1-discover"] = Date.now() - stageStart;
    if (discoveredUrls.length === 0) {
      console.warn("[pipeline] No URLs discovered — aborting");
      logTimings(stageTimings);
      const outcome = buildOutcome(source.id, PIPELINE_SOURCE_NAME, "PARTIAL", startTime, {
        errorMessage: "Tavily returned no URLs",
      });
      await logIngestion(outcome);
      return outcome;
    }

    // Stage 2: Filter domains
    stageStart = Date.now();
    const filteredUrls = filterDomains(discoveredUrls);
    stageTimings["2-filter"] = Date.now() - stageStart;
    console.log(`[pipeline] ${filteredUrls.length}/${discoveredUrls.length} URLs after domain filtering`);
    for (const u of filteredUrls) {
      const hasContent = u.rawContent ? `${u.rawContent.length} chars` : "no content";
      console.log(`[pipeline]   → ${u.url} (${hasContent})`);
    }

    if (filteredUrls.length === 0) {
      logTimings(stageTimings);
      const outcome = buildOutcome(source.id, PIPELINE_SOURCE_NAME, "PARTIAL", startTime, {
        errorMessage: "All discovered URLs were filtered out",
      });
      await logIngestion(outcome);
      return outcome;
    }

    // Stage 3: Convert Tavily raw content to pages (no Firecrawl needed)
    stageStart = Date.now();
    const pages: CrawledPage[] = filteredUrls
      .filter((u) => u.rawContent && u.rawContent.length > 0)
      .map((u) => ({
        url: u.url,
        domain: extractDomain(u.url),
        markdown: u.rawContent!,
      }));
    stageTimings["3-convert"] = Date.now() - stageStart;
    console.log(`[pipeline] ${pages.length}/${filteredUrls.length} URLs have Tavily markdown content`);

    if (pages.length === 0) {
      logTimings(stageTimings);
      const outcome = buildOutcome(source.id, PIPELINE_SOURCE_NAME, "PARTIAL", startTime, {
        errorMessage: "Tavily returned no raw content for any URL",
      });
      await logIngestion(outcome);
      return outcome;
    }

    // Stage 4: Extract events via DeepSeek (includes pre-filter + markdown cleaning)
    stageStart = Date.now();
    const extractions = await extractEventsFromPages(pages, city);
    stageTimings["4-extract"] = Date.now() - stageStart;

    // Stage 5: Validate events (deterministic)
    stageStart = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const perDomain = new Map<string, {
      valid: ValidatedEvent[];
      expired: typeof extractions[0]["events"];
      invalid: typeof extractions[0]["events"];
    }>();

    for (const extraction of extractions) {
      const { valid, expired, invalid } = validateEvents(extraction.events, city, today);
      const existing = perDomain.get(extraction.domain);
      if (existing) {
        existing.valid.push(...valid);
        existing.expired.push(...expired);
        existing.invalid.push(...invalid);
      } else {
        perDomain.set(extraction.domain, { valid, expired, invalid });
      }
    }
    stageTimings["5-validate"] = Date.now() - stageStart;

    // Stage 6: Source yield control
    stageStart = Date.now();
    // expired events (past date, structurally sound) don't count against source quality
    const yieldInput = Array.from(perDomain.entries()).map(([domain, { valid, expired, invalid }]) => ({
      domain,
      valid,
      invalid,
      expired,
    }));
    const { acceptedEvents, reports } = enforceSourceYield(yieldInput);
    stageTimings["6-yield"] = Date.now() - stageStart;

    logYieldReports(reports);

    if (acceptedEvents.length === 0) {
      logTimings(stageTimings);
      const outcome = buildOutcome(source.id, PIPELINE_SOURCE_NAME, "PARTIAL", startTime, {
        eventsFound: yieldInput.reduce((sum, r) => sum + r.valid.length + r.expired.length + r.invalid.length, 0),
        errorMessage: "All sources rejected by yield control",
      });
      await logIngestion(outcome);
      return outcome;
    }

    // Stage 7-8: Dedup + persist
    stageStart = Date.now();
    let eventsCreated = 0;
    let eventsUpdated = 0;
    let eventsDuplicate = 0;
    const errors: string[] = [];

    for (const event of acceptedEvents) {
      try {
        const rawEvent = validatedEventToRawData(event, city);
        const result = await processEvent(rawEvent, source);

        if (result === "created") eventsCreated++;
        else if (result === "updated") eventsUpdated++;
        else if (result === "duplicate") eventsDuplicate++;
        else console.warn(`[pipeline] persist: "${event.title}" → ${result}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`"${event.title}": ${message}`);
        console.error(`[pipeline] persist error: "${event.title}": ${message}`);
      }
    }
    stageTimings["7-persist"] = Date.now() - stageStart;

    // Update source health
    await updateSourceHealth(source.id, eventsCreated > 0);

    logTimings(stageTimings);

    const status = errors.length > 0 && eventsCreated === 0 ? "PARTIAL" : "SUCCESS";
    const outcome = buildOutcome(source.id, PIPELINE_SOURCE_NAME, status, startTime, {
      eventsFound: acceptedEvents.length,
      eventsCreated,
      eventsUpdated,
      eventsDuplicate,
      errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
    });

    await logIngestion(outcome);
    console.log(`[pipeline] Phase A done: ${eventsCreated} created, ${eventsUpdated} updated, ${eventsDuplicate} dupes, ${errors.length} errors`);
    return outcome;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[pipeline] Phase A failed:", errorMessage);

    await updateSourceHealth(source.id, false);

    const outcome = buildOutcome(source.id, PIPELINE_SOURCE_NAME, "FAILED", startTime, {
      errorMessage,
    });
    await logIngestion(outcome);
    return outcome;
  }
}

// ============================================
// Phase B: Score
// ============================================

interface ScoreOptions {
  /** Max events to score per run. Default 50. */
  limit?: number;
}

/**
 * Phase B: Score unscored events, rank, and update DB.
 * Picks up events with culturalScore = null.
 */
export async function runScorePhase(
  options: ScoreOptions = {}
): Promise<{ scored: number; errors: string[] }> {
  const limit = options.limit ?? 50;

  // Fetch unscored active events
  const unscoredRows = await prisma.culturalEvent.findMany({
    where: {
      culturalScore: null,
      status: "ACTIVE",
    },
    select: {
      id: true,
      title: true,
      description: true,
      venueName: true,
      category: true,
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  if (unscoredRows.length === 0) {
    console.log("[pipeline] Phase B: no unscored events");
    return { scored: 0, errors: [] };
  }

  console.log(`[pipeline] Phase B: scoring ${unscoredRows.length} events`);

  const eventsToScore: EventToScore[] = unscoredRows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    venueName: row.venueName,
    category: row.category,
  }));

  // Score with DeepSeek
  const scoredResults = await scoreEvents(eventsToScore);

  // Rank for diversity (to compute finalScore with diversity context)
  const rankableEvents: RankableEvent[] = scoredResults.map((s) => {
    const row = unscoredRows.find((r) => r.id === s.eventId);
    return {
      eventId: s.eventId,
      scoring: s.scoring,
      finalScore: s.finalScore,
      venueName: row?.venueName ?? "",
    };
  });

  const rankedIds = rankAndDiversify(rankableEvents);

  // Update DB with scores + rank order
  const errors: string[] = [];
  let scored = 0;

  for (let i = 0; i < rankedIds.length; i++) {
    const eventId = rankedIds[i]!;
    const scoreResult = scoredResults.find((s) => s.eventId === eventId);
    if (!scoreResult) continue;

    try {
      await prisma.culturalEvent.update({
        where: { id: eventId },
        data: {
          culturalScore: scoreResult.scoring.culturalInterestScore,
          originalityScore: scoreResult.scoring.originalityScore,
          editorialHighlight: scoreResult.scoring.editorialHighlight || null,
          culturalCategory: scoreResult.scoring.culturalCategory,
          finalScore: scoreResult.finalScore,
        },
      });
      scored++;
    } catch (error) {
      errors.push(`Event ${eventId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`[pipeline] Phase B done: ${scored}/${unscoredRows.length} scored`);
  return { scored, errors };
}

// ============================================
// Helpers
// ============================================

async function getOrCreatePipelineSource() {
  const existing = await prisma.eventSource.findUnique({
    where: { name: PIPELINE_SOURCE_NAME },
  });

  if (existing) return existing;

  return prisma.eventSource.create({
    data: {
      type: "WEB_DISCOVERY",
      name: PIPELINE_SOURCE_NAME,
      reliabilityScore: 70,
      isActive: true,
    },
  });
}

/** Convert a validated pipeline event into the common RawEventData shape. */
function validatedEventToRawData(event: ValidatedEvent, city: string): RawEventData {
  const category = detectCategory({
    title: event.title,
    description: event.description,
    tags: [event.categoryGuess],
  });

  // Combine date + time into a proper ISO datetime
  const startDate = combineDateTime(event.date, event.time);

  return {
    title: event.title,
    description: event.description,
    startDate,
    venueName: event.venue,
    address: event.address ?? undefined,
    cityName: city,
    category,
    sourceUrl: event.sourceUrl,
    tags: [event.categoryGuess],
    priceMin: event.priceMin ?? undefined,
    priceMax: event.priceMax ?? undefined,
    currency: "ARS",
    artists: event.artists.length > 0 ? event.artists : undefined,
  };
}

/**
 * Combine a YYYY-MM-DD date with an optional HH:MM time into an ISO string.
 * If time is provided, produces "2026-02-28T21:00:00" (local time).
 * If not, produces "2026-02-28" (date only, parsed as midnight UTC by Prisma).
 */
function combineDateTime(dateStr: string, timeStr: string | null): string {
  if (!timeStr) return dateStr;

  // Normalize common time formats: "21:00h" → "21:00", "21.30" → "21:30"
  const cleaned = timeStr.replace(/h$/i, "").replace(".", ":").trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(cleaned);
  if (!match) return dateStr;

  const hours = match[1]!.padStart(2, "0");
  const minutes = match[2]!;
  return `${dateStr}T${hours}:${minutes}:00`;
}

function logYieldReports(reports: SourceYieldReport[]): void {
  for (const report of reports) {
    const status = report.accepted ? "ACCEPTED" : "REJECTED";
    console.log(
      `[pipeline] yield: ${report.domain} → ${status} (${report.validCount} valid, ${report.invalidCount} invalid, ${Math.round(report.invalidRate * 100)}% invalid)`
    );
  }
}

function logTimings(timings: Record<string, number>): void {
  const total = Object.values(timings).reduce((sum, ms) => sum + ms, 0);
  console.log(`[pipeline] ⏱ Stage timings (total ${(total / 1000).toFixed(1)}s):`);
  for (const [stage, ms] of Object.entries(timings)) {
    const pct = total > 0 ? Math.round((ms / total) * 100) : 0;
    console.log(`[pipeline]   ${stage}: ${(ms / 1000).toFixed(1)}s (${pct}%)`);
  }
}
