/**
 * Tavily Search API client — primary web search provider for relax suggestions.
 * Uses advanced search with full page content (rawContent) so the LLM
 * can extract concrete data: showtimes, ticket prices, event dates, menus.
 * Free tier: 1000 credits/month (2 credits per advanced search).
 * Graceful: returns [] if no API key or on failure — never blocks the pipeline.
 */

import { tavily } from "@tavily/core";
import { extractDomain } from "./web-search";

import type { WebSearchResult } from "./web-search";

// ============================================
// Types
// ============================================

interface TavilyCacheEntry {
  data: WebSearchResult[];
  expiresAt: number;
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  rawContent?: string;
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

// ============================================
// In-memory cache
// ============================================

const tavilyCache = new Map<string, TavilyCacheEntry>();

// ============================================
// Main function
// ============================================

/**
 * Search using Tavily advanced search with rawContent.
 * Receives pre-built queries and a cache key from the orchestrator.
 * Returns an empty array if no API key is configured or on failure.
 */
export async function searchWithTavily(
  queries: string[],
  cacheKey: string
): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const cached = tavilyCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const client = tavily({ apiKey });

    // Run all queries in parallel for speed
    const queryResults = await Promise.all(
      queries.map((query) => runSingleQuery(client, query))
    );

    // Merge and deduplicate by URL
    const seenUrls = new Set<string>();
    const results: WebSearchResult[] = [];

    for (const batch of queryResults) {
      for (const result of batch) {
        if (!seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          results.push(result);
        }
      }
    }

    tavilyCache.set(cacheKey, { data: results, expiresAt: Date.now() + TAVILY_CACHE_TTL_MS });
    return results;
  } catch (error) {
    console.error("[tavily] Search failed:", error);
    return [];
  }
}

// ============================================
// Query execution
// ============================================

/** Run a single Tavily advanced query, returning [] on failure (never throws). */
async function runSingleQuery(
  client: ReturnType<typeof tavily>,
  query: string
): Promise<WebSearchResult[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);

    const response = await client.search(query, {
      searchDepth: "advanced",
      includeRawContent: "markdown",
      includeImages: true,
      maxResults: 8,
      topic: "general",
    });
    clearTimeout(timeout);

    // Tavily returns images as a top-level array — build domain lookup
    // Only assign an image to a result if it comes from the same domain
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
      rawContent: r.rawContent ?? null,
      url: r.url,
      source: extractDomain(r.url),
      imageUrl: imageByDomain.get(extractDomain(r.url)) ?? null,
    }));
  } catch (error) {
    console.warn(`[tavily] Query "${query}" failed:`, error);
    return [];
  }
}
