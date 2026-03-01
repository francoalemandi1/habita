/**
 * Persistence helpers for the pipeline.
 *
 * Extracted from ingestion-orchestrator.ts — handles:
 * - Event processing (dedup, normalize, insert)
 * - Source health tracking
 * - Ingestion logging
 * - Category auto-detection
 */

import { prisma } from "@/lib/prisma";
import { resolveCityId } from "../city-normalizer";
import { generateEventSlug } from "../slug-generator";
import { findDuplicate, mergeEvents } from "../deduplicator";
import { CATEGORY_KEYWORDS } from "../constants";

import type { EventCategory, EventSource } from "@prisma/client";
import type { RawEventData, IngestionOutcome } from "../types";

// ============================================
// Event processing
// ============================================

export type ProcessOutcome = "created" | "updated" | "duplicate" | "skipped";

/** Curator data to persist alongside the event. */
export interface CurationData {
  culturalScore: number;
  originalityScore: number;
  editorialHighlight: string;
  culturalCategory: string;
  finalScore: number;
}

/**
 * Process a single event: dedup check, normalize, insert or merge.
 * Returns the outcome for counting.
 */
export async function processEvent(
  rawEvent: RawEventData,
  source: EventSource,
  curation?: CurationData,
): Promise<ProcessOutcome> {
  // Skip events without title
  if (!rawEvent.title.trim()) return "skipped";

  // Skip events with past dates
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

  const endDate = parseDate(rawEvent.endDate);
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
      // Curator scores (populated when coming from pipeline)
      ...(curation && {
        culturalScore: curation.culturalScore,
        originalityScore: curation.originalityScore,
        editorialHighlight: curation.editorialHighlight || null,
        culturalCategory: curation.culturalCategory,
        finalScore: curation.finalScore,
      }),
    },
  });

  return "created";
}

// ============================================
// Category auto-detection
// ============================================

export function detectCategory(event: RawEventData): EventCategory {
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

export async function updateSourceHealth(sourceId: string, isSuccess: boolean): Promise<void> {
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

export async function logIngestion(outcome: IngestionOutcome): Promise<void> {
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
    console.error("[pipeline] Failed to log ingestion:", error);
  }
}

// ============================================
// Pipeline status tracking
// ============================================

/** Stale threshold — RUNNING entries older than this are considered crashed. */
const STALE_PIPELINE_TIMEOUT_MS = 5 * 60 * 1000;

/** Create a RUNNING log entry at pipeline start. Returns the log ID. */
export async function markPipelineRunning(sourceId: string, city: string): Promise<string> {
  const log = await prisma.eventIngestionLog.create({
    data: {
      sourceId,
      status: "RUNNING",
      city,
      startedAt: new Date(),
    },
  });
  return log.id;
}

/** Transition a RUNNING log entry to its final status. */
export async function completePipelineLog(
  logId: string,
  outcome: IngestionOutcome,
): Promise<void> {
  try {
    await prisma.eventIngestionLog.update({
      where: { id: logId },
      data: {
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
    console.error("[pipeline] Failed to complete pipeline log:", error);
  }
}

/**
 * Check if there's a running pipeline for a city.
 * Cleans up stale RUNNING entries (>5 min) as crash protection.
 */
export async function findRunningPipeline(city: string) {
  const cutoff = new Date(Date.now() - STALE_PIPELINE_TIMEOUT_MS);

  // Clean up stale RUNNING entries (crash protection)
  await prisma.eventIngestionLog.updateMany({
    where: {
      status: "RUNNING",
      city,
      startedAt: { lt: cutoff },
    },
    data: {
      status: "FAILED",
      errorMessage: "Pipeline timed out (stale RUNNING entry cleaned up)",
    },
  });

  // Check for a genuinely running pipeline
  return prisma.eventIngestionLog.findFirst({
    where: {
      status: "RUNNING",
      city,
      startedAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      startedAt: true,
    },
  });
}

// ============================================
// Outcome builder
// ============================================

export function buildOutcome(
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

// ============================================
// Pipeline source
// ============================================

const PIPELINE_SOURCE_NAME = "external-pipeline";

export async function getOrCreatePipelineSource() {
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

// ============================================
// Helpers
// ============================================

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
