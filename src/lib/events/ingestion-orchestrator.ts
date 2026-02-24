/**
 * Ingestion orchestrator — runs a single provider per invocation,
 * normalizes events, deduplicates, and persists to the database.
 *
 * Called by the cron endpoint: POST /api/cron/events/ingest
 */

import { prisma } from "@/lib/prisma";
import { getProvider } from "./providers/registry";
import { resolveCityId } from "./city-normalizer";
import { generateEventSlug } from "./slug-generator";
import { findDuplicate, mergeEvents } from "./deduplicator";
import { DEFAULT_MAX_EVENTS_PER_RUN, PROVIDER_TIMEOUT_MS, CATEGORY_KEYWORDS } from "./constants";

import type { EventCategory, EventSource } from "@prisma/client";
import type { IngestionOutcome, RawEventData } from "./types";

// ============================================
// Main orchestrator
// ============================================

/**
 * Run ingestion for a single provider.
 * Fetches events, normalizes, deduplicates, and persists.
 */
export async function runIngestion(sourceName: string): Promise<IngestionOutcome> {
  const startTime = Date.now();

  // 1. Load the source record from DB
  const source = await prisma.eventSource.findUnique({
    where: { name: sourceName },
  });

  if (!source || !source.isActive) {
    return buildOutcome(source?.id ?? "", sourceName, "FAILED", startTime, {
      errorMessage: source ? "Source is inactive" : `Source "${sourceName}" not found in DB`,
    });
  }

  // 2. Get the provider implementation
  const provider = await getProvider(sourceName);
  if (!provider) {
    return buildOutcome(source.id, sourceName, "FAILED", startTime, {
      errorMessage: `No provider registered for "${sourceName}"`,
    });
  }

  // 3. Fetch events with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  let eventsFound = 0;
  let eventsCreated = 0;
  let eventsUpdated = 0;
  let eventsDuplicate = 0;
  let fetchErrors: string[] = [];

  try {
    // Pass persisted cursor from source config (used by Exa to rotate queries)
    const sourceConfig = (source.config as Record<string, unknown>) ?? {};
    const cursor = typeof sourceConfig.cursor === "string" ? sourceConfig.cursor : undefined;

    const result = await provider.fetchEvents({
      signal: controller.signal,
      maxEvents: DEFAULT_MAX_EVENTS_PER_RUN,
      cursor,
    });

    eventsFound = result.events.length;
    fetchErrors = result.errors;

    // Persist returned cursor for the next run
    if (result.cursor) {
      await prisma.eventSource.update({
        where: { id: source.id },
        data: { config: { ...sourceConfig, cursor: result.cursor } },
      });
    }

    // 4. Process each event individually (errors don't abort the batch)
    for (const rawEvent of result.events) {
      try {
        const outcome = await processEvent(rawEvent, source);
        if (outcome === "created") eventsCreated++;
        else if (outcome === "updated") eventsUpdated++;
        else if (outcome === "duplicate") eventsDuplicate++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[ingestion] Event processing error: ${message}`);
        fetchErrors.push(`Event "${rawEvent.title}": ${message}`);
      }
    }

    // 5. Update source health
    await updateSourceHealth(source.id, eventsFound > 0);

    const status = fetchErrors.length > 0 && eventsCreated === 0 ? "PARTIAL" : "SUCCESS";

    const outcome = buildOutcome(source.id, sourceName, status, startTime, {
      eventsFound,
      eventsCreated,
      eventsUpdated,
      eventsDuplicate,
      errorMessage: fetchErrors.length > 0 ? fetchErrors.join("; ") : undefined,
    });

    // 6. Log ingestion result
    await logIngestion(outcome);

    return outcome;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ingestion] Provider "${sourceName}" failed:`, errorMessage);

    await updateSourceHealth(source.id, false);

    const outcome = buildOutcome(source.id, sourceName, "FAILED", startTime, {
      eventsFound,
      eventsCreated,
      eventsUpdated,
      eventsDuplicate,
      errorMessage,
    });

    await logIngestion(outcome);
    return outcome;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Pick the next source that is due for ingestion (round-robin by lastFetchedAt).
 * Returns the source name, or null if all sources are inactive.
 */
export async function pickNextDueSource(): Promise<string | null> {
  const source = await prisma.eventSource.findFirst({
    where: { isActive: true },
    orderBy: [
      { lastFetchedAt: { sort: "asc", nulls: "first" } },
    ],
    select: { name: true },
  });

  return source?.name ?? null;
}

// ============================================
// Event processing
// ============================================

type ProcessOutcome = "created" | "updated" | "duplicate" | "skipped";

async function processEvent(
  rawEvent: RawEventData,
  source: EventSource
): Promise<ProcessOutcome> {
  // Skip events without title
  if (!rawEvent.title.trim()) return "skipped";

  // Skip events with past dates (hard filter — LLM extraction is unreliable)
  const startDate = parseDate(rawEvent.startDate);
  if (startDate && startDate < getStartOfToday()) return "skipped";

  // Resolve city
  const cityId = rawEvent.cityName
    ? await resolveCityId(rawEvent.cityName)
    : null;

  // Check for duplicates
  const dupResult = await findDuplicate(rawEvent, cityId);

  if (dupResult.isDuplicate && dupResult.existingEventId) {
    await mergeEvents(dupResult.existingEventId, rawEvent, source.id);
    return "updated";
  }

  // Auto-categorize if no category
  const category = rawEvent.category ?? detectCategory(rawEvent);

  // Parse end date (startDate already parsed above for the past-date filter)
  const endDate = parseDate(rawEvent.endDate);

  // Generate slug
  const slug = await generateEventSlug(rawEvent.title, startDate);

  // Resolve province from city if available
  let province = rawEvent.province;
  if (!province && cityId) {
    const city = await prisma.culturalCity.findUnique({
      where: { id: cityId },
      select: { province: true },
    });
    province = city?.province;
  }

  // Insert new event
  await prisma.culturalEvent.create({
    data: {
      title: rawEvent.title,
      description: rawEvent.description ?? null,
      slug,
      startDate,
      endDate,
      venueName: rawEvent.venueName ?? null,
      address: rawEvent.address ?? null,
      latitude: rawEvent.latitude ?? null,
      longitude: rawEvent.longitude ?? null,
      cityId,
      province: province ?? null,
      category,
      tags: rawEvent.tags ?? [],
      artists: rawEvent.artists ?? [],
      priceMin: rawEvent.priceMin ?? null,
      priceMax: rawEvent.priceMax ?? null,
      currency: rawEvent.currency ?? "ARS",
      sourceId: source.id,
      sourceUrl: rawEvent.sourceUrl ?? null,
      sourceEventId: rawEvent.sourceEventId ?? null,
      imageUrl: rawEvent.imageUrl ?? null,
      status: rawEvent.status ?? "ACTIVE",
    },
  });

  return "created";
}

// ============================================
// Category auto-detection
// ============================================

function detectCategory(event: RawEventData): EventCategory {
  const searchText = [
    event.title,
    event.description,
    ...(event.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "OTRO") continue;
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        return category as EventCategory;
      }
    }
  }

  return "OTRO";
}

// ============================================
// Source health tracking
// ============================================

async function updateSourceHealth(sourceId: string, isSuccess: boolean): Promise<void> {
  const now = new Date();

  if (isSuccess) {
    await prisma.eventSource.update({
      where: { id: sourceId },
      data: {
        lastFetchedAt: now,
        lastSuccessAt: now,
        errorCount: 0,
      },
    });
  } else {
    await prisma.eventSource.update({
      where: { id: sourceId },
      data: {
        lastFetchedAt: now,
        errorCount: { increment: 1 },
      },
    });
  }
}

// ============================================
// Ingestion logging
// ============================================

async function logIngestion(outcome: IngestionOutcome): Promise<void> {
  try {
    await prisma.eventIngestionLog.create({
      data: {
        sourceId: outcome.sourceId,
        status: outcome.status,
        eventsFound: outcome.eventsFound,
        eventsCreated: outcome.eventsCreated,
        eventsUpdated: outcome.eventsUpdated,
        eventsDuplicate: outcome.eventsDuplicate,
        errorMessage: outcome.errorMessage ?? null,
        durationMs: outcome.durationMs,
      },
    });
  } catch (error) {
    console.error("[ingestion] Failed to log ingestion:", error);
  }
}

// ============================================
// Helpers
// ============================================

function buildOutcome(
  sourceId: string,
  sourceName: string,
  status: "SUCCESS" | "PARTIAL" | "FAILED",
  startTime: number,
  overrides: Partial<IngestionOutcome> = {}
): IngestionOutcome {
  return {
    sourceId,
    sourceName,
    status,
    eventsFound: 0,
    eventsCreated: 0,
    eventsUpdated: 0,
    eventsDuplicate: 0,
    durationMs: Date.now() - startTime,
    ...overrides,
  };
}

function parseDate(date?: Date | string): Date | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return isNaN(d.getTime()) ? null : d;
}

function getStartOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}
