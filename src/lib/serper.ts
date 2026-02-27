/**
 * Serper.dev (Google Search API) client — fallback when Tavily quota is exhausted.
 * Free tier: 2500 one-time credits (1 credit per search query).
 * Limitation: No rawContent (full page content) — only Google SERP snippets.
 * The LLM pipeline handles this gracefully: buildWebContentBlock() falls back to snippet.
 * Graceful: returns [] on failure — never blocks the pipeline.
 */

import type { WebSearchResult } from "./web-search";

// ============================================
// Types
// ============================================

interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperSearchResponse {
  organic: SerperOrganicResult[];
}

interface SerperImageResult {
  title: string;
  imageUrl: string;
  link: string;
}

interface SerperImageResponse {
  images: SerperImageResult[];
}

interface SerperCacheEntry {
  data: WebSearchResult[];
  expiresAt: number;
}

// ============================================
// Constants
// ============================================

const SERPER_BASE_URL = "https://google.serper.dev";
const SERPER_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const SERPER_TIMEOUT_MS = 10000;
const SNIPPET_MAX_LENGTH = 500;

// ============================================
// In-memory cache
// ============================================

const serperCache = new Map<string, SerperCacheEntry>();

// ============================================
// Helpers
// ============================================

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ============================================
// Main function
// ============================================

/**
 * Search using Serper.dev Google Search API.
 * Runs all queries in parallel + one image query for thumbnails.
 * Returns WebSearchResult[] with rawContent: null (Serper doesn't provide page content).
 */
export async function searchWithSerper(
  queries: string[],
  cacheKey: string,
  countryCode?: string
): Promise<WebSearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  const cached = serperCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    // Run web searches + one image search in parallel
    const imageQuery = queries[0] ?? "";
    const [webBatches, imageResults] = await Promise.all([
      Promise.all(queries.map((query) => runSerperSearch(apiKey, query, countryCode))),
      fetchSerperImages(apiKey, imageQuery),
    ]);

    // Build image lookup by domain — only show image if it matches the result's source
    const imageByDomain = new Map<string, string>();
    for (const img of imageResults) {
      const domain = extractDomain(img.link);
      if (!imageByDomain.has(domain)) {
        imageByDomain.set(domain, img.imageUrl);
      }
    }

    // Merge and deduplicate by URL
    const seenUrls = new Set<string>();
    const results: WebSearchResult[] = [];

    for (const batch of webBatches) {
      for (const result of batch) {
        if (seenUrls.has(result.url)) continue;
        seenUrls.add(result.url);

        const domain = extractDomain(result.url);
        results.push({
          ...result,
          imageUrl: imageByDomain.get(domain) ?? null,
        });
      }
    }

    serperCache.set(cacheKey, { data: results, expiresAt: Date.now() + SERPER_CACHE_TTL_MS });
    return results;
  } catch (error) {
    console.error("[serper] Search failed:", error);
    return [];
  }
}

// ============================================
// API calls
// ============================================

/** Run a single Serper web search, returning [] on failure (never throws). */
async function runSerperSearch(
  apiKey: string,
  query: string,
  countryCode?: string
): Promise<WebSearchResult[]> {
  try {
    const response = await fetch(`${SERPER_BASE_URL}/search`, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: 20,
        hl: "es",
        ...(countryCode && { gl: countryCode }),
      }),
      signal: AbortSignal.timeout(SERPER_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(`[serper] Search HTTP ${response.status} for "${query}"`);
      return [];
    }

    const data = (await response.json()) as SerperSearchResponse;

    return (data.organic ?? [])
      .filter((r) => r.title && r.snippet)
      .map((r) => ({
        title: r.title,
        snippet: r.snippet.length > SNIPPET_MAX_LENGTH
          ? `${r.snippet.slice(0, SNIPPET_MAX_LENGTH)}...`
          : r.snippet,
        rawContent: null,
        url: r.link,
        source: extractDomain(r.link),
        imageUrl: null,
      }));
  } catch (error) {
    console.warn(`[serper] Query "${query}" failed:`, error);
    return [];
  }
}

/** Fetch images from Serper image search endpoint. Returns [] on failure. */
async function fetchSerperImages(
  apiKey: string,
  query: string
): Promise<SerperImageResult[]> {
  try {
    const response = await fetch(`${SERPER_BASE_URL}/images`, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 10 }),
      signal: AbortSignal.timeout(SERPER_TIMEOUT_MS),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as SerperImageResponse;
    return data.images ?? [];
  } catch {
    return [];
  }
}
