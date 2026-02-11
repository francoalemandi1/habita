/**
 * Tavily Search API client — sole data source for relax suggestions.
 * Uses advanced search with full page content (rawContent) so the LLM
 * can extract concrete data: showtimes, ticket prices, event dates, menus.
 * Free tier: 1000 credits/month (2 credits per advanced search).
 * Graceful: returns [] if no API key or on failure — never blocks the pipeline.
 */

import { tavily } from "@tavily/core";

/** Duplicated from relax-finder to avoid circular imports */
type RelaxSection = "culture" | "restaurants" | "weekend";

// ============================================
// Types
// ============================================

export interface WebSearchResult {
  title: string;
  snippet: string;
  rawContent: string | null;
  url: string;
  source: string;
  imageUrl: string | null;
}

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

// ============================================
// Constants
// ============================================

const TAVILY_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const TAVILY_TIMEOUT_MS = 15000;
const SNIPPET_MAX_LENGTH = 500;

/** Map ISO 3166-1 alpha-2 codes to full country names for query disambiguation. */
const ISO_TO_COUNTRY_NAME: Record<string, string> = {
  AR: "Argentina",
  BO: "Bolivia",
  BR: "Brasil",
  CL: "Chile",
  CO: "Colombia",
  CR: "Costa Rica",
  CU: "Cuba",
  DO: "República Dominicana",
  EC: "Ecuador",
  SV: "El Salvador",
  GT: "Guatemala",
  HN: "Honduras",
  MX: "México",
  NI: "Nicaragua",
  PA: "Panamá",
  PY: "Paraguay",
  PE: "Perú",
  PR: "Puerto Rico",
  ES: "España",
  UY: "Uruguay",
  VE: "Venezuela",
  US: "Estados Unidos",
};

/**
 * Multiple specific queries per section to get actionable data
 * (showtimes, ticket prices, specific events) instead of generic articles.
 * Each query costs 2 credits (advanced) → 2-3 queries per section = 4-6 credits.
 * `location` includes city + country for disambiguation (e.g. "Córdoba, Argentina").
 */
const SECTION_QUERIES: Record<RelaxSection, (location: string) => string[]> = {
  culture: (location) => [
    `cartelera cine ${location} hoy películas horarios`,
    `obras teatro shows recitales ${location} esta semana`,
    `exposiciones museos muestras ${location} agenda cultural`,
  ],
  restaurants: (location) => [
    `mejores restaurantes nuevos ${location} reseñas`,
    `bares cervecerías apertura ${location} recomendados`,
  ],
  weekend: (location) => [
    `actividades fin de semana ${location} agenda`,
    `ferias mercados eventos aire libre ${location} esta semana`,
  ],
};

// ============================================
// In-memory cache
// ============================================

const tavilyCache = new Map<string, TavilyCacheEntry>();

function buildCacheKey(city: string, section: RelaxSection): string {
  return `${section}:${city.toLowerCase().trim()}`;
}

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
 * Search for local events and trends using Tavily advanced search.
 * Returns full page content (rawContent) alongside snippets so the LLM
 * can extract concrete data (showtimes, prices, dates).
 * Returns an empty array if no API key is configured or on failure.
 * Results are cached in-memory for 2 hours.
 */
export async function searchLocalEvents(
  city: string,
  country: string,
  section: RelaxSection
): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return [];
  }

  const cacheKey = buildCacheKey(city, section);
  const cached = tavilyCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const client = tavily({ apiKey });
    const countryName = ISO_TO_COUNTRY_NAME[country.toUpperCase()] ?? country;
    const location = countryName ? `${city}, ${countryName}` : city;
    const queries = SECTION_QUERIES[section](location);

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
    console.error(`[tavily] Search failed for ${section}/${city}:`, error);
    return [];
  }
}

/** Tavily image object returned when includeImages is true */
interface TavilyImage {
  url: string;
  description?: string;
}

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

    // Tavily returns images as a top-level array — collect valid URLs
    const imageUrls: string[] = [];
    if (Array.isArray(response.images)) {
      for (const img of response.images) {
        const url = typeof img === "string" ? img : (img as TavilyImage).url;
        if (url) imageUrls.push(url);
      }
    }

    // Assign images round-robin to results (best effort — no 1:1 mapping from Tavily)
    const results = (response.results as TavilySearchResult[])
      .filter((r) => r.title && r.content);

    return results.map((r, i) => ({
      title: r.title,
      snippet: r.content.length > SNIPPET_MAX_LENGTH
        ? `${r.content.slice(0, SNIPPET_MAX_LENGTH)}...`
        : r.content,
      rawContent: r.rawContent ?? null,
      url: r.url,
      source: extractDomain(r.url),
      imageUrl: imageUrls[i] ?? null,
    }));
  } catch (error) {
    console.warn(`[tavily] Query "${query}" failed:`, error);
    return [];
  }
}
