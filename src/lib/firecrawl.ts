/**
 * Firecrawl client — scrapes URLs and extracts structured event data.
 *
 * Uses Firecrawl's LLM Extract (JSON format) to get structured data directly
 * from each page, eliminating the need for a separate LLM extraction step.
 *
 * Cost: 5 credits per URL (1 base + 4 JSON extract).
 * Free tier: 500 one-time credits.
 * Graceful: returns partial results on failure — never blocks the pipeline.
 */

import Firecrawl from "@mendable/firecrawl-js";
import { z } from "zod";

// ============================================
// Types
// ============================================

export interface ExtractedEvent {
  title: string;
  venue: string;
  dateText: string | null;
  timeText: string | null;
  priceText: string | null;
  description: string;
  ticketUrl: string | null;
  bookingUrl: string | null;
}

export interface ScrapeResult {
  url: string;
  events: ExtractedEvent[];
}

// ============================================
// Constants
// ============================================

/** Timeout per URL — LLM extract is slower than plain scrape */
const EXTRACT_TIMEOUT_MS = 90000;

/** Max concurrent extractions to avoid rate limits */
const CONCURRENCY_LIMIT = 5;

// ============================================
// Zod schema for LLM extraction
// ============================================

const eventSchema = z.object({
  events: z.array(z.object({
    title: z.string().describe("Exact event/show/movie name as written on the page"),
    venue: z.string().describe("Exact venue name with address if present"),
    dateText: z.string().nullable().describe("Exact date as written: 'Sábado 1 de marzo', 'Del 15 al 28 de febrero'. null if not found"),
    timeText: z.string().nullable().describe("Exact time as written: '20:30h', 'de 11 a 20h'. null if not found"),
    priceText: z.string().nullable().describe("Exact price as written: '$5000', 'Gratis', 'desde $3000'. null if not found"),
    description: z.string().describe("One factual sentence about what this event is"),
    ticketUrl: z.string().nullable().describe("Direct URL to buy tickets if present on page. null if not found"),
    bookingUrl: z.string().nullable().describe("Direct URL to make reservations if present on page. null if not found"),
  })),
});

const EXTRACT_PROMPT = "Extract ALL events, shows, movies, plays, fairs, festivals, exhibitions, concerts, and activities from this page. Each item is a separate event. Copy dates, times, and prices exactly as written — never invent data. If the page lists multiple showtimes for a movie, include all times in timeText.";

// ============================================
// Markdown scrape (pipeline Stage 3)
// ============================================

/** Timeout for markdown-only scrape (faster than LLM extract). */
const SCRAPE_TIMEOUT_MS = 30_000;

/**
 * Scrape a single URL to markdown (1 credit/URL).
 * Used by the pipeline for DeepSeek extraction (cheaper than Firecrawl LLM extract).
 */
export async function scrapeToMarkdown(
  url: string,
): Promise<{ url: string; markdown: string } | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;

  const client = new Firecrawl({ apiKey });

  try {
    const result = await client.scrape(url, {
      formats: ["markdown"],
      timeout: SCRAPE_TIMEOUT_MS,
    });

    const markdown = (result as { markdown?: string }).markdown;
    if (!markdown) return null;

    return { url, markdown };
  } catch (error) {
    console.warn(`[firecrawl] Markdown scrape failed for ${url}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Batch scrape URLs to markdown with concurrency control.
 * Returns only successful results (failures are silently skipped).
 */
export async function batchScrapeToMarkdown(
  urls: string[],
  concurrency = 3,
): Promise<Array<{ url: string; markdown: string }>> {
  if (urls.length === 0) return [];

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return [];

  const results: Array<{ url: string; markdown: string }> = [];

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map((url) => scrapeToMarkdown(url))
    );

    for (const result of batchResults) {
      if (result) results.push(result);
    }

    console.log(`[firecrawl] markdown batch ${Math.floor(i / concurrency)}: ${batchResults.filter(Boolean).length}/${batch.length} URLs`);
  }

  return results;
}

// ============================================
// LLM extract (legacy — used by restaurants section)
// ============================================

/**
 * Scrape and extract structured events from multiple URLs.
 * Uses Firecrawl's LLM JSON extract to get events directly.
 */
export async function extractEventsFromUrls(urls: string[]): Promise<ScrapeResult[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey || urls.length === 0) return [];

  const client = new Firecrawl({ apiKey });
  const results: ScrapeResult[] = [];

  for (let i = 0; i < urls.length; i += CONCURRENCY_LIMIT) {
    const batch = urls.slice(i, i + CONCURRENCY_LIMIT);

    const batchResults = await Promise.all(
      batch.map((url) => extractOne(client, url))
    );

    for (const result of batchResults) {
      if (result && result.events.length > 0) results.push(result);
    }

    const eventCount = batchResults.reduce((sum, r) => sum + (r?.events.length ?? 0), 0);
    console.log(`[firecrawl] batch ${Math.floor(i / CONCURRENCY_LIMIT)}: ${batchResults.filter(Boolean).length}/${batch.length} URLs, ${eventCount} events`);
  }

  const totalEvents = results.reduce((sum, r) => sum + r.events.length, 0);
  console.log(`[firecrawl] total: ${results.length}/${urls.length} URLs with events, ${totalEvents} events extracted`);
  return results;
}

// ============================================
// Single URL extract
// ============================================

async function extractOne(
  client: Firecrawl,
  url: string,
): Promise<ScrapeResult | null> {
  try {
    const result = await client.scrape(url, {
      formats: [{ type: "json" as const, schema: eventSchema, prompt: EXTRACT_PROMPT }],
      timeout: EXTRACT_TIMEOUT_MS,
    });

    const json = result.json as z.infer<typeof eventSchema> | undefined;
    if (!json?.events) return null;

    return { url, events: json.events };
  } catch (error) {
    console.warn(`[firecrawl] Failed to extract ${url}:`, error instanceof Error ? error.message : error);
    return null;
  }
}
