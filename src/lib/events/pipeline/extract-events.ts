/**
 * Stage 3: DeepSeek event extraction — strict JSON mode.
 *
 * Given markdown from Tavily raw content, extracts structured events using DeepSeek.
 * Includes pre-filtering (skip pages without event-like patterns) and markdown
 * cleaning (strip nav/footer noise) to reduce tokens and speed up extraction.
 *
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

/** Max pages to process in parallel. DeepSeek handles high concurrency well. */
const EXTRACTION_CONCURRENCY = 10;

/** Max characters of markdown per page for DeepSeek extraction context. */
const MARKDOWN_MAX_CHARS = 8_000;

/** Minimum markdown length to be worth sending to DeepSeek. */
const MARKDOWN_MIN_CHARS = 200;

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

YEAR INFERENCE (CRITICAL — READ CAREFULLY):
- The current year is ${todayIso.slice(0, 4)}. Today is ${todayIso}.
- If a date includes an EXPLICIT YEAR → use that year as-is.
- If a date has NO EXPLICIT YEAR (e.g. "27 de marzo", "Sábado 15 de abril"):
  1. If the page contextualizes dates to a year (e.g. "Agenda 2026", "Temporada 2026", "Cartelera marzo 2026") → use that year.
  2. Otherwise, assume the current year (${todayIso.slice(0, 4)}) ONLY if the resulting date is within the next 90 days from today. If it would fall MORE than 90 days in the future or in the past → SKIP the event.
  3. IMPORTANT: after assigning the year, still apply the PAST EVENT SIGNALS check below. If the page says "evento finalizado" or similar → SKIP regardless.

PAST EVENT SIGNALS (CRITICAL):
- If the page contains "evento finalizado", "evento pasado", "sold out" (past tense), "ya fue", "finalizada", "agotado" near an event → SKIP that event.
- If a ticketing page shows no "comprar" / "comprar entradas" button but shows "evento finalizado" → the event is over, SKIP it.

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
 * Pre-filters pages without event patterns, cleans markdown, then
 * processes in parallel batches with retry on JSON parse failure.
 */
export async function extractEventsFromPages(
  pages: CrawledPage[],
  city: string,
): Promise<PageExtractionResult[]> {
  if (pages.length === 0) return [];

  // Pre-filter: skip pages that don't look like event listings
  const candidates = pages.filter((page) => {
    if (page.markdown.length < MARKDOWN_MIN_CHARS) {
      console.log(`[extract-events] SKIP (too short: ${page.markdown.length} chars) ${page.url}`);
      return false;
    }
    if (!looksLikeEventContent(page.markdown)) {
      console.log(`[extract-events] SKIP (no event patterns) ${page.url}`);
      return false;
    }
    return true;
  });

  console.log(`[extract-events] ${candidates.length}/${pages.length} pages passed pre-filter`);

  // Clean markdown: strip nav/footer noise, truncate to budget
  const cleaned: CrawledPage[] = candidates.map((page) => ({
    ...page,
    markdown: cleanAndTruncateMarkdown(page.markdown),
  }));

  const todayIso = new Date().toISOString().slice(0, 10);
  const systemPrompt = buildSystemPrompt(city, todayIso);
  const results: PageExtractionResult[] = [];

  // Process in concurrent batches
  for (let i = 0; i < cleaned.length; i += EXTRACTION_CONCURRENCY) {
    const batch = cleaned.slice(i, i + EXTRACTION_CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map((page) => extractFromPage(page, systemPrompt))
    );

    for (const result of batchResults) {
      if (result) results.push(result);
    }
  }

  const totalEvents = results.reduce((sum, r) => sum + r.events.length, 0);
  console.log(`[extract-events] ${totalEvents} events from ${results.length}/${cleaned.length} pages`);

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

// ============================================
// Pre-filter: does the markdown look like event content?
// ============================================

/**
 * Quick heuristic check: does this markdown contain patterns typical of
 * event listings? (dates, times, prices, venue keywords in Spanish).
 * Avoids sending nav-only or empty pages to DeepSeek.
 */
function looksLikeEventContent(markdown: string): boolean {
  const lower = markdown.toLowerCase();

  // Date patterns: "1 de marzo", "15/03", "2026-03-01", "sábado 1"
  const datePatterns = [
    /\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/,
    /\d{1,2}\/\d{1,2}/,
    /\d{4}-\d{2}-\d{2}/,
    /(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+\d/i,
  ];

  // Time patterns: "20:30", "21h", "de 19 a 22"
  const timePatterns = [
    /\d{1,2}:\d{2}/,
    /\d{1,2}\s*h\b/,
    /de\s+\d{1,2}\s+a\s+\d{1,2}/,
  ];

  // Venue/event keywords in Spanish
  const eventKeywords = [
    "teatro", "cine", "museo", "sala", "centro cultural",
    "exposición", "exposicion", "concierto", "recital",
    "función", "funcion", "estreno", "entradas", "localidades",
    "gratis", "entrada libre", "bono contribución",
  ];

  const hasDate = datePatterns.some((p) => p.test(lower));
  const hasTime = timePatterns.some((p) => p.test(lower));
  const hasKeyword = eventKeywords.some((k) => lower.includes(k));

  // Need at least a date + (time OR keyword) to qualify
  return hasDate && (hasTime || hasKeyword);
}

// ============================================
// Markdown cleaning + truncation
// ============================================

/**
 * Clean markdown noise (nav links, footers, repeated whitespace)
 * and truncate to MARKDOWN_MAX_CHARS for DeepSeek context budget.
 */
function cleanAndTruncateMarkdown(markdown: string): string {
  let cleaned = markdown;

  // Remove navigation link blocks: lines that are just "[text](url)" or "* [text](url)"
  cleaned = cleaned.replace(/^[\s*-]*\[([^\]]{1,40})\]\([^)]+\)\s*$/gm, "");

  // Remove lines that are purely URLs
  cleaned = cleaned.replace(/^https?:\/\/\S+\s*$/gm, "");

  // Collapse 3+ consecutive blank lines into 2
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Trim leading/trailing whitespace
  cleaned = cleaned.trim();

  // Truncate at last newline before limit
  if (cleaned.length <= MARKDOWN_MAX_CHARS) return cleaned;
  const truncated = cleaned.slice(0, MARKDOWN_MAX_CHARS);
  const lastNewline = truncated.lastIndexOf("\n");
  return lastNewline > MARKDOWN_MAX_CHARS * 0.8
    ? truncated.slice(0, lastNewline)
    : truncated;
}
