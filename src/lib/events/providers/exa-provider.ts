/**
 * Exa web discovery provider — discovers event pages via semantic search
 * and extracts structured event data using LLM.
 *
 * Architecture:
 * 1. Exa API search (neural) → web pages with content
 * 2. LLM extraction via generateObject() → RawEventData[]
 *
 * Performance budget: 2 queries per run, parallel extraction.
 * DeepSeek generateObject takes ~15-45s per call depending on content size.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { getAIProviderType } from "@/lib/llm/provider";
import { getDeepSeekModel } from "@/lib/llm/deepseek-provider";
import { getExaDiscoveryQueries } from "../constants";

import type { LanguageModel } from "ai";
import type { EventProvider, FetchOptions } from "./base-provider";
import type { ProviderFetchResult, RawEventData } from "../types";

// ============================================
// Exa API types
// ============================================

interface ExaSearchResult {
  title: string;
  url: string;
  text?: string;
  highlights?: string[];
  publishedDate?: string;
  image?: string;
}

interface ExaSearchResponse {
  results: ExaSearchResult[];
}

// ============================================
// LLM extraction schema
// ============================================

const extractedEventSchema = z.object({
  events: z.array(z.object({
    title: z.string().min(1),
    description: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    venueName: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    cityName: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    artists: z.array(z.string()).nullable().optional(),
    priceMin: z.number().nullable().optional(),
    priceMax: z.number().nullable().optional(),
    sourceUrl: z.string().nullable().optional(),
  })).max(20),
});

// ============================================
// Constants
// ============================================

const EXA_API_URL = "https://api.exa.ai/search";
const MAX_RESULTS_PER_QUERY = 6;
const QUERIES_PER_RUN = 2;
/** Max chars per search result — keep low to speed up LLM extraction. */
const CONTENT_MAX_CHARS = 2000;

// ============================================
// Provider implementation
// ============================================

export class ExaProvider implements EventProvider {
  readonly sourceName = "exa-web";

  async fetchEvents(options: FetchOptions): Promise<ProviderFetchResult> {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      return { events: [], hasMore: false, errors: ["EXA_API_KEY not configured"] };
    }

    const errors: string[] = [];
    const allEvents: RawEventData[] = [];

    // Rotate queries: use cursor as index into the dynamic query list
    const allQueries = getExaDiscoveryQueries();
    const startIndex = options.cursor ? parseInt(options.cursor, 10) : 0;
    const queries = selectQueries(allQueries, startIndex, QUERIES_PER_RUN);

    // Phase 1: Run all Exa searches in parallel
    const searchPromises = queries.map(async (query) => {
      try {
        const results = await searchExa(apiKey, query, options.signal);
        return { query, results, error: null };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { query, results: [] as ExaSearchResult[], error: message };
      }
    });

    const searchResults = await Promise.all(searchPromises);

    // Collect search errors
    for (const sr of searchResults) {
      if (sr.error) {
        errors.push(`Search "${sr.query}": ${sr.error}`);
      }
    }

    if (options.signal.aborted) {
      return { events: [], hasMore: false, errors: [...errors, "Aborted after search phase"] };
    }

    // Phase 2: Build content blocks and extract events in parallel
    const extractionTasks = searchResults
      .filter((sr) => !sr.error && sr.results.length > 0)
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

        if (!contentBlock.trim()) return null;

        return extractEventsFromContent(contentBlock, query, results, options.signal)
          .then((extracted) => ({ query, extracted, error: null }))
          .catch((error) => {
            const message = error instanceof Error ? error.message : String(error);
            return { query, extracted: [] as RawEventData[], error: message };
          });
      })
      .filter(Boolean);

    const extractionResults = await Promise.all(extractionTasks);

    for (const er of extractionResults) {
      if (!er) continue;
      if (er.error) {
        errors.push(`Extract "${er.query}": ${er.error}`);
      }
      allEvents.push(...er.extracted);
    }

    const nextIndex = (startIndex + QUERIES_PER_RUN) % allQueries.length;
    const hasMore = allEvents.length >= options.maxEvents;

    return {
      events: allEvents.slice(0, options.maxEvents),
      hasMore,
      cursor: String(nextIndex),
      errors,
    };
  }
}

// ============================================
// Exa API search
// ============================================

export async function searchExa(
  apiKey: string,
  query: string,
  signal: AbortSignal
): Promise<ExaSearchResult[]> {
  const response = await fetch(EXA_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      numResults: MAX_RESULTS_PER_QUERY,
      type: "neural",
      useAutoprompt: true,
      contents: {
        text: { maxCharacters: CONTENT_MAX_CHARS },
        highlights: { numSentences: 5 },
      },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Exa API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ExaSearchResponse;
  return data.results ?? [];
}

// ============================================
// LLM extraction
// ============================================

export async function extractEventsFromContent(
  contentBlock: string,
  query: string,
  sources: ExaSearchResult[],
  signal: AbortSignal
): Promise<RawEventData[]> {
  const model = getExtractionModel();

  const todayIso = new Date().toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const prompt = `## Tarea

Extraé eventos culturales concretos del siguiente contenido web.

## Fecha actual: ${todayIso}

Solo incluí eventos FUTUROS (hoy o después). Descartá eventos que ya pasaron.

## Contenido

${contentBlock}

## Reglas

- EXTRACCIÓN, no invención. Solo usá información presente en el contenido.
- Cada evento debe tener al menos título.
- Si una fecha es mencionada como "este sábado" o "este fin de semana", calculá la fecha exacta basándote en que hoy es ${todayIso}.
- Formato de fechas: ISO 8601 (YYYY-MM-DD o YYYY-MM-DDTHH:mm).
- cityName: nombre de la ciudad donde ocurre el evento.
- category: una de cine, teatro, musica, exposiciones, festivales, mercados, paseos, excursiones, talleres, danza, literatura, gastronomia, deportes, infantil, otro.
- Si no hay dato para un campo, omitilo.`;

  const generated = await generateObject({
    model,
    schema: extractedEventSchema,
    prompt,
    abortSignal: signal,
  });

  return generated.object.events.map((event) => {
    // Find matching source URL and image
    const matchingSource = sources.find((s) =>
      event.sourceUrl ? s.url === event.sourceUrl : s.title.includes(event.title.slice(0, 20))
    );

    return {
      title: event.title,
      description: event.description ?? undefined,
      startDate: event.startDate ?? undefined,
      endDate: event.endDate ?? undefined,
      venueName: event.venueName ?? undefined,
      address: event.address ?? undefined,
      cityName: event.cityName ?? undefined,
      category: mapCategoryString(event.category ?? undefined),
      tags: event.tags ?? undefined,
      artists: event.artists ?? undefined,
      priceMin: event.priceMin ?? undefined,
      priceMax: event.priceMax ?? undefined,
      sourceUrl: event.sourceUrl ?? matchingSource?.url,
      imageUrl: matchingSource?.image,
    };
  });
}

// ============================================
// Helpers
// ============================================

function getExtractionModel(): LanguageModel {
  const providerType = getAIProviderType();
  if (providerType === "gemini") {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    return google("gemini-2.0-flash");
  }
  return getDeepSeekModel();
}

function selectQueries(pool: string[], startIndex: number, count: number): string[] {
  const queries: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (startIndex + i) % pool.length;
    queries.push(pool[idx]!);
  }
  return queries;
}

function mapCategoryString(raw?: string): undefined {
  // Category mapping handled by the orchestrator's auto-categorizer
  // We pass it through as a tag hint instead
  return undefined;
}
