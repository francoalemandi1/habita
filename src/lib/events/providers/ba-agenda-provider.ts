/**
 * Buenos Aires cultural agenda provider — ingests events from the
 * city's official cultural agenda via web search + LLM extraction.
 *
 * Strategy:
 * 1. Use Tavily to fetch agenda page content (rawContent)
 * 2. Pass content to LLM for structured event extraction
 * 3. Return RawEventData[]
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { searchWithTavily } from "@/lib/tavily";
import { getAIProviderType } from "@/lib/llm/provider";
import { getDeepSeekModel } from "@/lib/llm/deepseek-provider";

import type { LanguageModel } from "ai";
import type { EventProvider, FetchOptions } from "./base-provider";
import type { ProviderFetchResult, RawEventData } from "../types";

// ============================================
// Constants
// ============================================

const AGENDA_QUERIES = [
  "agenda cultural Buenos Aires esta semana",
  "cartelera teatro Buenos Aires",
  "eventos y ferias Buenos Aires esta semana",
];

const CACHE_KEY = "ba-agenda:discovery";
const CONTENT_MAX_CHARS = 6000;

// ============================================
// LLM extraction schema
// ============================================

const extractedEventSchema = z.object({
  events: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    venueName: z.string().optional(),
    address: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    artists: z.array(z.string()).optional(),
    priceMin: z.number().optional(),
    priceMax: z.number().optional(),
    sourceUrl: z.string().optional(),
  })).max(30),
});

// ============================================
// Provider implementation
// ============================================

export class BuenosAiresAgendaProvider implements EventProvider {
  readonly sourceName = "ba-agenda";

  async fetchEvents(options: FetchOptions): Promise<ProviderFetchResult> {
    const errors: string[] = [];
    const allEvents: RawEventData[] = [];

    try {
      // 1. Fetch web content via Tavily
      const webResults = await searchWithTavily(AGENDA_QUERIES, CACHE_KEY);

      if (webResults.length === 0) {
        return { events: [], hasMore: false, errors: ["No web results from Tavily for BA agenda"] };
      }

      // 2. Build content block for LLM
      const contentBlock = webResults
        .map((r, i) => {
          const content = r.rawContent
            ? r.rawContent.slice(0, CONTENT_MAX_CHARS)
            : r.snippet;
          return `### [${i}] ${r.title} (${r.source})\n${content}`;
        })
        .join("\n\n---\n\n");

      // 3. Extract events via LLM
      const extracted = await extractEventsFromAgenda(contentBlock, webResults);
      allEvents.push(...extracted);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`BA agenda extraction: ${message}`);
    }

    return {
      events: allEvents.slice(0, options.maxEvents),
      hasMore: false,
      errors,
    };
  }
}

// ============================================
// LLM extraction
// ============================================

async function extractEventsFromAgenda(
  contentBlock: string,
  sources: { url: string; title: string }[]
): Promise<RawEventData[]> {
  const model = getExtractionModel();

  const todayIso = new Date().toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const prompt = `## Tarea

Extraé eventos culturales concretos de la agenda de Buenos Aires.

## Fecha actual: ${todayIso}

Solo incluí eventos FUTUROS (hoy o después). Descartá todo lo que ya pasó.

## Contenido de la agenda

${contentBlock}

## Reglas

- EXTRACCIÓN, no invención. Solo usá información presente en el contenido.
- Cada evento debe tener al menos título.
- Formato de fechas: ISO 8601 (YYYY-MM-DD o YYYY-MM-DDTHH:mm).
- Todos los eventos son en Buenos Aires (CABA).
- category: una de cine, teatro, musica, exposiciones, festivales, mercados, paseos, excursiones, talleres, danza, literatura, gastronomia, deportes, infantil, otro.
- Si un evento tiene precio "Gratis" o "Entrada libre", poné priceMin: 0.
- Si no hay dato para un campo, omitilo.
- Máximo 20 eventos. Priorizá eventos con fecha concreta.`;

  try {
    const generated = await generateObject({ model, schema: extractedEventSchema, prompt });

    return generated.object.events.map((event) => {
      // Try to find the source URL from Tavily results
      const matchingSource = sources.find((s) =>
        event.sourceUrl ? s.url === event.sourceUrl : false
      );

      return {
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        venueName: event.venueName,
        address: event.address,
        cityName: "Buenos Aires",
        category: undefined, // Let orchestrator auto-categorize
        tags: event.tags,
        artists: event.artists,
        priceMin: event.priceMin,
        priceMax: event.priceMax,
        sourceUrl: event.sourceUrl ?? matchingSource?.url,
      };
    });
  } catch (error) {
    console.error("[ba-agenda-provider] LLM extraction error:", error);
    return [];
  }
}

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
