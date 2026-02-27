/**
 * Tavily client — web search for relax suggestions.
 *
 * Flow:
 *   1. Tavily Search (advanced) → URLs + snippets            [2 credits/query]
 *   2. Firecrawl LLM Extract → structured events per URL     [5 credits/URL]
 *
 * Tavily free tier: 1000 credits/month.
 * Firecrawl free tier: 500 one-time credits.
 * Graceful: returns [] if no API key or on failure — never blocks the pipeline.
 */

import { tavily } from "@tavily/core";
import { extractDomain } from "./web-search";
import { extractEventsFromUrls } from "./firecrawl";

import type { WebSearchResult } from "./web-search";
import type { ExtractedEvent, ScrapeResult } from "./firecrawl";

// ============================================
// Types
// ============================================

export interface SearchAndExtractResult {
  /** Original search results (for images, source URLs) */
  searchResults: WebSearchResult[];
  /** Structured events extracted from page content */
  extractedEvents: ExtractedEventWithSource[];
}

export interface ExtractedEventWithSource {
  event: ExtractedEvent;
  sourceUrl: string;
  sourceDomain: string;
}

interface TavilyCacheEntry {
  data: SearchAndExtractResult;
  expiresAt: number;
}

interface TavilySearchOnlyCacheEntry {
  data: WebSearchResult[];
  expiresAt: number;
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}

/** Tavily image object returned when includeImages is true */
interface TavilyImage {
  url: string;
  description?: string;
}

// ============================================
// Constants
// ============================================

const TAVILY_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const TAVILY_TIMEOUT_MS = 15000;
const SNIPPET_MAX_LENGTH = 500;

/** Max total results after dedup across all queries */
const MAX_SEARCH_RESULTS = 10;

/** Max URLs to send to Firecrawl for LLM extraction (5 credits each) */
const MAX_EXTRACT_URLS = 5;

/**
 * Domains excluded from Tavily search results.
 *
 * Activities: tourism aggregators and booking sites that never have
 * real local event data with dates/times/prices.
 *
 * Restaurants: only booking/travel sites — review sites like
 * TripAdvisor are valuable for restaurant recommendations.
 */
export const EXCLUDED_DOMAINS_ACTIVITIES = [
  "viator.com",
  "getyourguide.com",
  "civitatis.com",
  "klook.com",
  "tiqets.com",
  "musement.com",
  "tripadvisor.com",
  "tripadvisor.com.ar",
  "despegar.com",
  "booking.com",
  "airbnb.com",
  "tangol.com",
  "welcomeargentina.com",
  "minube.com",
  "lonelyplanet.com",
];

export const EXCLUDED_DOMAINS_RESTAURANTS = [
  "viator.com",
  "getyourguide.com",
  "civitatis.com",
  "klook.com",
  "tiqets.com",
  "musement.com",
  "despegar.com",
  "booking.com",
  "airbnb.com",
];

/**
 * Domains skipped for Firecrawl extraction — their content is too large/generic
 * but their snippets from search are still useful for curator context.
 */
const SKIP_EXTRACT_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "wikipedia.org",
  "reddit.com",
];

// ============================================
// In-memory cache
// ============================================

const tavilyCache = new Map<string, TavilyCacheEntry>();
const tavilySearchOnlyCache = new Map<string, TavilySearchOnlyCacheEntry>();

// ============================================
// Main function
// ============================================

/**
 * Search with Tavily, then extract structured events with Firecrawl.
 *
 * Step 1: Tavily advanced search → URLs + snippets
 * Step 2: Firecrawl LLM extract → structured events from each page
 * Step 3: Flatten events with source URLs
 */
export async function searchAndExtract(
  queries: string[],
  cacheKey: string,
  country?: string,
  maxResultsPerQuery?: number,
  excludeDomains?: string[]
): Promise<SearchAndExtractResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { searchResults: [], extractedEvents: [] };

  const cached = tavilyCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const client = tavily({ apiKey });

    // Step 1: Search — get URLs + snippets
    const perQuery = maxResultsPerQuery ?? MAX_SEARCH_RESULTS;
    const queryResults = await Promise.all(
      queries.map((query) => runSearch(client, query, country, perQuery, excludeDomains))
    );

    // Merge, deduplicate by URL — take top N per query to ensure category diversity
    const seenUrls = new Set<string>();
    const searchResults: WebSearchResult[] = [];

    for (const batch of queryResults) {
      let taken = 0;
      for (const result of batch) {
        if (taken >= perQuery) break;
        if (!seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          searchResults.push(result);
          taken++;
        }
      }
    }

    console.log(`[tavily] search: ${searchResults.length} results`);

    // Step 2: Extract structured events with Firecrawl
    // Filter out social media, homepages, and cap at MAX_EXTRACT_URLS
    const urlsToExtract = searchResults
      .filter((r) => !SKIP_EXTRACT_DOMAINS.some((d) => r.source.includes(d)))
      .filter((r) => !isHomepageUrl(r.url))
      .map((r) => r.url)
      .slice(0, MAX_EXTRACT_URLS);

    console.log(`[tavily] extracting events from ${urlsToExtract.length} URLs with Firecrawl`);

    const scrapeResults = await extractEventsFromUrls(urlsToExtract);

    // Step 3: Flatten events with source info
    const extractedEvents = flattenEvents(scrapeResults);

    console.log(`[tavily] ${extractedEvents.length} events extracted from ${scrapeResults.length} URLs`);

    const result = { searchResults, extractedEvents };
    tavilyCache.set(cacheKey, { data: result, expiresAt: Date.now() + TAVILY_CACHE_TTL_MS });
    return result;
  } catch (error) {
    console.error("[tavily] Search+Extract failed:", error);
    return { searchResults: [], extractedEvents: [] };
  }
}

// ============================================
// Search-only (for grocery-advisor, deals-finder, ba-agenda)
// ============================================

/**
 * Search-only Tavily query — no Firecrawl extraction.
 * Used by consumers that only need URLs + snippets (grocery, deals, etc.).
 */
export async function searchWithTavily(
  queries: string[],
  cacheKey: string,
  country?: string
): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  // Check search-and-extract cache first (reuse if available)
  const fullCached = tavilyCache.get(cacheKey);
  if (fullCached && Date.now() < fullCached.expiresAt) {
    return fullCached.data.searchResults;
  }

  // Check search-only cache
  const searchCached = tavilySearchOnlyCache.get(cacheKey);
  if (searchCached && Date.now() < searchCached.expiresAt) {
    return searchCached.data;
  }

  try {
    const client = tavily({ apiKey });

    const queryResults = await Promise.all(
      queries.map((query) => runSearch(client, query, country))
    );

    const seenUrls = new Set<string>();
    const results: WebSearchResult[] = [];

    for (const batch of queryResults) {
      for (const result of batch) {
        if (results.length >= MAX_SEARCH_RESULTS) break;
        if (!seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          results.push(result);
        }
      }
    }

    tavilySearchOnlyCache.set(cacheKey, { data: results, expiresAt: Date.now() + TAVILY_CACHE_TTL_MS });
    return results;
  } catch (error) {
    console.error("[tavily] Search failed:", error);
    return [];
  }
}

// ============================================
// Helpers
// ============================================

/** Homepage URLs (path = "/" or empty) are portals with navigation, not event listings. */
function isHomepageUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/$/, "");
    return path === "";
  } catch {
    return false;
  }
}

function flattenEvents(scrapeResults: ScrapeResult[]): ExtractedEventWithSource[] {
  const events: ExtractedEventWithSource[] = [];

  for (const result of scrapeResults) {
    const domain = extractDomain(result.url);
    for (const event of result.events) {
      events.push({
        event,
        sourceUrl: result.url,
        sourceDomain: domain,
      });
    }
  }

  return events;
}

// ============================================
// Search
// ============================================

/** Run a single Tavily search query, returning [] on failure. */
async function runSearch(
  client: ReturnType<typeof tavily>,
  query: string,
  country?: string,
  maxResults = 10,
  excludeDomains?: string[]
): Promise<WebSearchResult[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);

    const response = await client.search(query, {
      searchDepth: "advanced",
      includeRawContent: false,
      includeImages: true,
      maxResults,
      topic: "general",
      ...(excludeDomains && { excludeDomains }),
      ...(country && { country }),
    });
    clearTimeout(timeout);

    // Build domain → image lookup
    const imageByDomain = new Map<string, string>();
    if (Array.isArray(response.images)) {
      for (const img of response.images) {
        const imgUrl = typeof img === "string" ? img : (img as TavilyImage).url;
        if (!imgUrl) continue;
        const domain = extractDomain(imgUrl);
        if (!imageByDomain.has(domain)) {
          imageByDomain.set(domain, imgUrl);
        }
      }
    }

    const results = (response.results as TavilySearchResult[])
      .filter((r) => r.title && r.content);

    return results.map((r) => ({
      title: r.title,
      snippet: r.content.length > SNIPPET_MAX_LENGTH
        ? `${r.content.slice(0, SNIPPET_MAX_LENGTH)}...`
        : r.content,
      rawContent: null,
      url: r.url,
      source: extractDomain(r.url),
      imageUrl: imageByDomain.get(extractDomain(r.url)) ?? null,
    }));
  } catch (error) {
    console.warn(`[tavily] Search "${query}" failed:`, error);
    return [];
  }
}
