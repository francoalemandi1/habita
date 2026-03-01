/**
 * Pipeline orchestrator — single linear flow.
 *
 * 1. Tavily search (URLs + markdown)
 * 2. Domain filter (deterministic blocklist)
 * 3. Convert Tavily rawContent → pages
 * 4. DeepSeek extractor (1 call per page, parallel)
 * 5. Deterministic filter (date + wrongLocation)
 * 6. DeepSeek curator (batch scoring + highlights)
 * 7. Persist with scores
 */

import { extractDomain } from "@/lib/web-search";
import { discoverUrls } from "./discover-urls";
import { filterDomains } from "./domain-filter";
import { extractEventsFromPages } from "./extract-events";
import { filterEvents } from "./validate-events";
import { curateEvents } from "./curate-events";
import {
  processEvent,
  detectCategory,
  updateSourceHealth,
  logIngestion,
  completePipelineLog,
  buildOutcome,
  getOrCreatePipelineSource,
} from "./persistence";

import type { IngestionOutcome, RawEventData } from "../types";
import type { CrawledPage, CuratedEvent, ExtractedEvent } from "./types";

// ============================================
// Main function
// ============================================

interface PipelineOptions {
  city: string;
  country: string;
  /** Pre-created RUNNING log ID (fire-and-forget flow). When absent, uses logIngestion (cron flow). */
  runningLogId?: string;
}

/**
 * Run the full event pipeline: discover → extract → filter → curate → persist.
 * All events are persisted with scores in a single pass.
 */
export async function runPipeline(options: PipelineOptions): Promise<IngestionOutcome> {
  const startTime = Date.now();
  const { city, country, runningLogId } = options;

  /** Persist outcome: update existing RUNNING row or create new log entry. */
  const persistOutcome = async (outcome: IngestionOutcome) => {
    if (runningLogId) {
      await completePipelineLog(runningLogId, outcome);
    } else {
      await logIngestion(outcome);
    }
  };

  const source = await getOrCreatePipelineSource();

  try {
    console.log(`[pipeline] Starting pipeline for ${city}, ${country}`);
    const timings: Record<string, number> = {};
    let stageStart = Date.now();

    // Stage 1: Discover URLs + content via Tavily
    const discoveredUrls = await discoverUrls(city, country);
    timings["1-discover"] = Date.now() - stageStart;
    if (discoveredUrls.length === 0) {
      logTimings(timings);
      const outcome = buildOutcome(source.id, "external-pipeline", "PARTIAL", startTime, {
        errorMessage: "Tavily returned no URLs",
      });
      await persistOutcome(outcome);
      return outcome;
    }

    // Stage 2: Filter domains (deterministic blocklist)
    stageStart = Date.now();
    const filteredUrls = filterDomains(discoveredUrls);
    timings["2-filter-domains"] = Date.now() - stageStart;
    console.log(`[pipeline] ${filteredUrls.length}/${discoveredUrls.length} URLs after domain filtering`);

    if (filteredUrls.length === 0) {
      logTimings(timings);
      const outcome = buildOutcome(source.id, "external-pipeline", "PARTIAL", startTime, {
        errorMessage: "All discovered URLs were filtered out",
      });
      await persistOutcome(outcome);
      return outcome;
    }

    // Stage 3: Convert Tavily raw content to pages
    stageStart = Date.now();
    const pages: CrawledPage[] = filteredUrls
      .filter((u) => u.rawContent && u.rawContent.length > 0)
      .map((u) => ({
        url: u.url,
        domain: extractDomain(u.url),
        markdown: u.rawContent!,
      }));
    timings["3-convert"] = Date.now() - stageStart;
    console.log(`[pipeline] ${pages.length}/${filteredUrls.length} URLs have markdown content`);

    if (pages.length === 0) {
      logTimings(timings);
      const outcome = buildOutcome(source.id, "external-pipeline", "PARTIAL", startTime, {
        errorMessage: "Tavily returned no raw content for any URL",
      });
      await persistOutcome(outcome);
      return outcome;
    }

    // Stage 4: Extract events via DeepSeek (1 call per page, parallel)
    stageStart = Date.now();
    const extractions = await extractEventsFromPages(pages, city);
    timings["4-extract"] = Date.now() - stageStart;

    const allExtracted: ExtractedEvent[] = extractions.flatMap((e) => e.events);
    console.log(`[pipeline] ${allExtracted.length} events extracted from ${extractions.length} pages`);

    if (allExtracted.length === 0) {
      logTimings(timings);
      const outcome = buildOutcome(source.id, "external-pipeline", "PARTIAL", startTime, {
        errorMessage: "DeepSeek extracted no events from any page",
      });
      await persistOutcome(outcome);
      return outcome;
    }

    // Stage 5: Deterministic filter (date + wrongLocation)
    stageStart = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { accepted: filteredEvents, rejected } = filterEvents(allExtracted, city, today);
    timings["5-filter-events"] = Date.now() - stageStart;
    console.log(`[pipeline] ${filteredEvents.length} accepted, ${rejected} rejected by date/location filter`);

    if (filteredEvents.length === 0) {
      logTimings(timings);
      const outcome = buildOutcome(source.id, "external-pipeline", "PARTIAL", startTime, {
        eventsFound: allExtracted.length,
        errorMessage: "All events rejected by date/location filter",
      });
      await persistOutcome(outcome);
      return outcome;
    }

    // Stage 6: DeepSeek curator (batch scoring + highlights)
    stageStart = Date.now();
    const curatedEvents = await curateEvents(filteredEvents, city);
    timings["6-curate"] = Date.now() - stageStart;

    // Stage 7: Persist with scores
    stageStart = Date.now();
    let eventsCreated = 0;
    let eventsUpdated = 0;
    let eventsDuplicate = 0;
    const errors: string[] = [];

    for (const event of curatedEvents) {
      try {
        const rawEvent = curatedEventToRawData(event, city);
        const result = await processEvent(rawEvent, source, {
          culturalScore: event.culturalScore,
          originalityScore: event.originalityScore,
          editorialHighlight: event.editorialHighlight,
          culturalCategory: event.culturalCategory,
          finalScore: event.finalScore,
        });

        if (result === "created") eventsCreated++;
        else if (result === "updated") eventsUpdated++;
        else if (result === "duplicate") eventsDuplicate++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`"${event.title}": ${message}`);
        console.error(`[pipeline] persist error: "${event.title}": ${message}`);
      }
    }
    timings["7-persist"] = Date.now() - stageStart;

    await updateSourceHealth(source.id, eventsCreated > 0);
    logTimings(timings);

    const status = errors.length > 0 && eventsCreated === 0 ? "PARTIAL" : "SUCCESS";
    const outcome = buildOutcome(source.id, "external-pipeline", status, startTime, {
      eventsFound: filteredEvents.length,
      eventsCreated,
      eventsUpdated,
      eventsDuplicate,
      errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
    });

    await persistOutcome(outcome);
    console.log(`[pipeline] Done: ${eventsCreated} created, ${eventsUpdated} updated, ${eventsDuplicate} dupes, ${errors.length} errors`);
    return outcome;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[pipeline] Pipeline failed:", errorMessage);

    await updateSourceHealth(source.id, false);

    const outcome = buildOutcome(source.id, "external-pipeline", "FAILED", startTime, {
      errorMessage,
    });
    await persistOutcome(outcome);
    return outcome;
  }
}

// ============================================
// Helpers
// ============================================

/** Convert a curated event into the common RawEventData shape for persistence. */
function curatedEventToRawData(event: CuratedEvent, city: string): RawEventData {
  const category = detectCategory({
    title: event.title,
    description: event.description,
    tags: [event.categoryGuess],
  });

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
 */
function combineDateTime(dateStr: string, timeStr: string | null): string {
  if (!timeStr) return dateStr;

  const cleaned = timeStr.replace(/h$/i, "").replace(".", ":").trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(cleaned);
  if (!match) return dateStr;

  const hours = match[1]!.padStart(2, "0");
  const minutes = match[2]!;
  return `${dateStr}T${hours}:${minutes}:00`;
}

function logTimings(timings: Record<string, number>): void {
  const total = Object.values(timings).reduce((sum, ms) => sum + ms, 0);
  console.log(`[pipeline] Stage timings (total ${(total / 1000).toFixed(1)}s):`);
  for (const [stage, ms] of Object.entries(timings)) {
    const pct = total > 0 ? Math.round((ms / total) * 100) : 0;
    console.log(`[pipeline]   ${stage}: ${(ms / 1000).toFixed(1)}s (${pct}%)`);
  }
}
