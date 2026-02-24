/**
 * On-demand event discovery for a specific city.
 *
 * When a user requests events for a city with 0 results in the DB,
 * this module runs a targeted Exa search + LLM extraction, persists
 * the results, and returns them — all within a single API call.
 *
 * Performance budget: ~30s (1 Exa search + 1 LLM extraction).
 */

import { prisma } from "@/lib/prisma";
import { searchExa, extractEventsFromContent } from "./providers/exa-provider";
import { resolveCityId } from "./city-normalizer";
import { generateEventSlug } from "./slug-generator";
import { findDuplicate, mergeEvents } from "./deduplicator";
import { CATEGORY_KEYWORDS } from "./constants";

import type { EventCategory, EventSource } from "@prisma/client";
import type { RawEventData } from "./types";

const CONTENT_MAX_CHARS = 2000;

/** Build 2 city-specific search queries. */
function buildCityQueries(cityName: string): string[] {
  const now = new Date();
  const monthNames = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const month = monthNames[now.getMonth()]!;
  const year = String(now.getFullYear());

  return [
    `agenda cultural ${cityName} argentina ${month} ${year}`,
    `eventos actividades qué hacer ${cityName} argentina ${month} ${year}`,
  ];
}

/**
 * Discover events for a city that has 0 results in the DB.
 * Runs Exa search + LLM extraction + DB persistence.
 * Returns the number of events created.
 */
export async function discoverEventsForCity(
  cityName: string,
  signal?: AbortSignal
): Promise<number> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return 0;

  // Get or create the exa-web source for attribution
  const source = await prisma.eventSource.findUnique({ where: { name: "exa-web" } });
  if (!source) return 0;

  const queries = buildCityQueries(cityName);
  const abortSignal = signal ?? AbortSignal.timeout(45_000);

  // Phase 1: Search in parallel
  const searchResults = await Promise.all(
    queries.map(async (query) => {
      try {
        return { query, results: await searchExa(apiKey, query, abortSignal) };
      } catch {
        return { query, results: [] };
      }
    })
  );

  if (abortSignal.aborted) return 0;

  // Phase 2: Extract in parallel
  const extractionPromises = searchResults
    .filter((sr) => sr.results.length > 0)
    .map(({ query, results }) => {
      const contentBlock = results
        .filter((r) => r.text || r.highlights?.length)
        .map((r) => {
          const content = r.text
            ? r.text.slice(0, CONTENT_MAX_CHARS)
            : (r.highlights ?? []).join("\n");
          return `## ${r.title}\nFuente: ${r.url}\n${content}`;
        })
        .join("\n\n---\n\n");

      if (!contentBlock.trim()) return Promise.resolve([]);

      return extractEventsFromContent(contentBlock, query, results, abortSignal)
        .catch(() => [] as RawEventData[]);
    });

  const extractionResults = await Promise.all(extractionPromises);
  const allRawEvents = extractionResults.flat();

  if (allRawEvents.length === 0) return 0;

  // Phase 3: Persist (reuses orchestrator logic inline)
  let created = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const rawEvent of allRawEvents) {
    try {
      if (!rawEvent.title.trim()) continue;

      const startDate = parseDate(rawEvent.startDate);
      if (startDate && startDate < today) continue;

      const cityId = rawEvent.cityName
        ? await resolveCityId(rawEvent.cityName)
        : null;

      const dupResult = await findDuplicate(rawEvent, cityId);
      if (dupResult.isDuplicate && dupResult.existingEventId) {
        await mergeEvents(dupResult.existingEventId, rawEvent, source.id);
        continue;
      }

      const category = rawEvent.category ?? detectCategory(rawEvent);
      const endDate = parseDate(rawEvent.endDate);
      const slug = await generateEventSlug(rawEvent.title, startDate);

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
        },
      });

      created++;
    } catch (error) {
      console.error(`[on-demand] Failed to persist event "${rawEvent.title}":`, error);
    }
  }

  return created;
}

// ============================================
// Helpers (duplicated from orchestrator to avoid circular deps)
// ============================================

function detectCategory(event: RawEventData): EventCategory {
  const searchText = [event.title, event.description, ...(event.tags ?? [])]
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

function parseDate(date?: Date | string): Date | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return isNaN(d.getTime()) ? null : d;
}
