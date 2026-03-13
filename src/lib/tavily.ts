/**
 * Tavily client — web search for relax suggestions.
 *
 * Flow:
 *   1. Tavily Search (advanced) → URLs + snippets + rawContent  [2 credits/query]
 *   2. Curator LLM curates results using rawContent (no Firecrawl)
 *
 * Tavily free tier: 1000 credits/month.
 * Graceful: returns [] if no API key or on failure — never blocks the pipeline.
 */

import { tavily } from "@tavily/core";
import { extractDomain } from "./web-search";

import type { WebSearchResult } from "./web-search";

// ============================================
// Types
// ============================================

export interface SearchAndExtractResult {
  /** Original search results (for images, source URLs, rawContent) */
  searchResults: WebSearchResult[];
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
 * Domains whose rawContent is too large/generic to send to the curator —
 * their snippets from search are still useful for context.
 */
const SKIP_RAW_CONTENT_DOMAINS = [
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
 * Search with Tavily and return results with rawContent for the curator.
 *
 * Step 1: Tavily advanced search with includeRawContent → URLs + snippets + markdown
 * Step 2: Filter social media / homepage rawContent
 *
 * The curator LLM (relax-finder) uses rawContent directly — no Firecrawl needed.
 */
export async function searchAndExtract(
  queries: string[],
  cacheKey: string,
  country?: string,
  maxResultsPerQuery?: number,
  excludeDomains?: string[]
): Promise<SearchAndExtractResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { searchResults: [] };

  const cached = tavilyCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const client = tavily({ apiKey });

    // Search with rawContent enabled
    const perQuery = maxResultsPerQuery ?? MAX_SEARCH_RESULTS;
    const queryResults = await Promise.all(
      queries.map((query) => runSearch(client, query, country, perQuery, excludeDomains, true))
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

    // Strip rawContent from social media / homepage URLs (too noisy)
    for (const result of searchResults) {
      if (SKIP_RAW_CONTENT_DOMAINS.some((d) => result.source.includes(d)) || isHomepageUrl(result.url)) {
        result.rawContent = null;
      }
    }

    const withContent = searchResults.filter((r) => r.rawContent).length;
    console.log(`[tavily] search: ${searchResults.length} results (${withContent} with rawContent)`);

    const data = { searchResults };
    tavilyCache.set(cacheKey, { data, expiresAt: Date.now() + TAVILY_CACHE_TTL_MS });
    return data;
  } catch (error) {
    console.error("[tavily] Search+Extract failed:", error);
    return { searchResults: [] };
  }
}

// ============================================
// Search-only (for grocery-advisor, deals-finder, ba-agenda)
// ============================================

/**
 * Search-only Tavily query — no rawContent.
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

// ============================================
// Search
// ============================================

/** Run a single Tavily search query, returning [] on failure. */
async function runSearch(
  client: ReturnType<typeof tavily>,
  query: string,
  country?: string,
  maxResults = 10,
  excludeDomains?: string[],
  includeRaw = false,
): Promise<WebSearchResult[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);

    const response = await client.search(query, {
      searchDepth: "advanced",
      includeRawContent: includeRaw ? "markdown" : false,
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
      rawContent: (includeRaw ? (r as TavilySearchResult & { rawContent?: string }).rawContent : null) ?? null,
      url: r.url,
      source: extractDomain(r.url),
      imageUrl: imageByDomain.get(extractDomain(r.url)) ?? null,
    }));
  } catch (error) {
    console.warn(`[tavily] Search "${query}" failed:`, error);
    return [];
  }
}
