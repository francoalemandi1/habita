/**
 * Stage 4: DeepSeek event extraction — strict JSON mode.
 *
 * Given markdown from crawled pages, extracts structured events using DeepSeek.
 * Temperature ≤ 0.2 for deterministic extraction.
 * Anti-hallucination rules enforced via system prompt.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { getDeepSeekModel } from "@/lib/llm/deepseek-provider";

import type { CrawledPage, ExtractedEvent, PageExtractionResult } from "./types";

// ============================================
// Constants
// ============================================

/** DeepSeek extraction temperature — low for strict mode. */
const EXTRACTION_TEMPERATURE = 0.2;

/** Max pages to process in parallel. */
const EXTRACTION_CONCURRENCY = 3;

// ============================================
// Zod schema (strict JSON output)
// ============================================

const extractedEventSchema = z.object({
  events: z.array(z.object({
    title: z.string().describe("Exact event title as written in the content"),
    date: z.string().describe("Date in ISO 8601 format YYYY-MM-DD. REQUIRED — skip event if no explicit date"),
    time: z.string().nullable().describe("Start time in HH:MM 24h format (e.g. '21:00'). null if not found"),
    venue: z.string().describe("Exact venue/location name. REQUIRED — skip event if no venue"),
    address: z.string().nullable().describe("Street address of the venue. null if not found"),
    category_guess: z.string().describe("Category: cine, teatro, musica, exposicion, feria, festival, taller, otro"),
    description: z.string().describe("Descripción factual en español, máximo 300 caracteres. Nunca inventar."),
    price_min: z.number().nullable().describe("Lowest ticket price in ARS (number only, no currency symbol). 0 if free. null if not mentioned"),
    price_max: z.number().nullable().describe("Highest ticket price in ARS (number only). null if same as price_min or not mentioned"),
    artists: z.array(z.string()).describe("Artist/performer/band names mentioned. Empty array if none"),
    source_url: z.string().describe("URL of the source page where this event was found"),
  })),
});

// ============================================
// System prompt (anti-hallucination)
// ============================================

function buildSystemPrompt(city: string, todayIso: string): string {
  return `You are a strict structured data extraction engine.

Your task is to extract future cultural events from the provided content.

CRITICAL RULES:
- Only extract events with an explicit calendar date.
- Only include events whose date is in the future relative to today (${todayIso}).
- Ignore past events.
- Ignore recurring schedules unless a specific date is provided.
- Ignore permanent exhibitions without specific dates.
- Ignore blog posts, press releases, or news summaries.
- Do NOT guess missing data.
- Do NOT infer missing dates.
- Do NOT infer venue names.
- If any required field is unclear → discard the event.
- Never fabricate information.
- If no valid events exist → return an empty array.

GEOGRAPHIC FILTER (CRITICAL):
- The target city is ${city}, ARGENTINA.
- ONLY include events physically located in ${city} or its immediate metropolitan area.
- REJECT events in other cities (Buenos Aires, C.A.B.A., Rosario, Mendoza, etc.).
- REJECT events in Spain (Córdoba España, Andalucía, etc.) — we want ARGENTINA only.
- If a page lists events from multiple cities, extract ONLY the ones in ${city}, Argentina.
- If a venue address contains "C. A. B. A.", "Buenos Aires", "España", or a Spanish postal code (CP + 5 digits) → SKIP that event.

OUTPUT LANGUAGE:
- ALL text fields (description) MUST be written in Spanish rioplatense (Argentina).
- Do NOT write descriptions in English. If the source is in English, translate to Spanish.
- Event titles should be kept as-is (original language).
- Venue names should be kept as-is.

PRICES:
- Extract ticket prices in ARS (Argentine pesos) as numbers.
- If a page shows multiple price tiers (e.g. "Platea Baja $40.000 | Platea Alta $38.000"), use the lowest as price_min and highest as price_max.
- If the event is free or "entrada libre", set price_min = 0.
- If no price is mentioned, set both to null.
- Remove thousands separators (e.g. "40.000" → 40000, "137.000" → 137000).
- If prices are in EUR or USD (not ARS), set both to null.

Return STRICT JSON only. No markdown, no explanations, no comments.`;
}

// ============================================
// Main function
// ============================================

/**
 * Extract structured events from crawled pages using DeepSeek.
 * Processes pages in parallel batches with retry on JSON parse failure.
 */
export async function extractEventsFromPages(
  pages: CrawledPage[],
  city: string,
): Promise<PageExtractionResult[]> {
  if (pages.length === 0) return [];

  const todayIso = new Date().toISOString().slice(0, 10);
  const systemPrompt = buildSystemPrompt(city, todayIso);
  const results: PageExtractionResult[] = [];

  // Process in concurrent batches
  for (let i = 0; i < pages.length; i += EXTRACTION_CONCURRENCY) {
    const batch = pages.slice(i, i + EXTRACTION_CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map((page) => extractFromPage(page, systemPrompt))
    );

    for (const result of batchResults) {
      if (result) results.push(result);
    }
  }

  const totalEvents = results.reduce((sum, r) => sum + r.events.length, 0);
  console.log(`[extract-events] ${totalEvents} events from ${results.length}/${pages.length} pages`);

  return results;
}

// ============================================
// Single page extraction
// ============================================

async function extractFromPage(
  page: CrawledPage,
  systemPrompt: string,
): Promise<PageExtractionResult | null> {
  const userPrompt = `Extract all future cultural events from this page (${page.url}):\n\n${page.markdown}`;

  // Attempt extraction with retry on failure
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const model = getDeepSeekModel();
      const result = await generateObject({
        model,
        schema: extractedEventSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: EXTRACTION_TEMPERATURE,
      });

      const events: ExtractedEvent[] = result.object.events.map((e) => ({
        title: e.title,
        date: e.date,
        time: e.time,
        venue: e.venue,
        address: e.address,
        categoryGuess: e.category_guess,
        description: e.description.slice(0, 300),
        priceMin: e.price_min,
        priceMax: e.price_max,
        artists: e.artists,
        sourceUrl: e.source_url || page.url,
      }));

      return {
        sourceUrl: page.url,
        domain: page.domain,
        events,
        rawCount: result.object.events.length,
      };
    } catch (error) {
      if (attempt === 0) {
        console.warn(`[extract-events] Retry for ${page.url}:`, error instanceof Error ? error.message : error);
        continue;
      }
      console.warn(`[extract-events] Discarding ${page.url} after 2 attempts:`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  return null;
}
