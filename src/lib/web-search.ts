/**
 * Unified web search module — orchestrates Tavily (primary) and Serper (fallback).
 *
 * Provider priority:
 *   1. Tavily (advanced search + Firecrawl LLM extract) — 1000 credits/month free
 *   2. Serper (Google SERP snippets + images) — 2500 one-time credits free
 *
 * Two main functions:
 *   - searchAndExtractLocalEvents(): Tavily search + Firecrawl extraction → used by relax-finder
 *   - searchLocalEvents(): Search-only → used by grocery-advisor, deals-finder, etc.
 */

import { searchAndExtract, searchWithTavily, EXCLUDED_DOMAINS_ACTIVITIES, EXCLUDED_DOMAINS_RESTAURANTS } from "./tavily";
import { searchWithSerper } from "./serper";

import type { SearchAndExtractResult, ExtractedEventWithSource } from "./tavily";

export type { SearchAndExtractResult, ExtractedEventWithSource };

// ============================================
// Shared types (consumed by tavily.ts, serper.ts, relax-finder.ts)
// ============================================

/** Duplicated from relax-finder to avoid circular imports */
export type RelaxSection = "activities" | "restaurants";

export interface WebSearchResult {
  title: string;
  snippet: string;
  rawContent: string | null;
  url: string;
  source: string;
  imageUrl: string | null;
}

// ============================================
// Shared constants
// ============================================

/** Map ISO 3166-1 alpha-2 codes to full country names for query disambiguation. */
export const ISO_TO_COUNTRY_NAME: Record<string, string> = {
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

/** Map ISO codes to Tavily's lowercase English country names for geo-biasing. */
export const ISO_TO_TAVILY_COUNTRY: Record<string, string> = {
  AR: "argentina", BO: "bolivia", BR: "brazil", CL: "chile",
  CO: "colombia", CR: "costa rica", CU: "cuba", DO: "dominican republic",
  EC: "ecuador", SV: "el salvador", GT: "guatemala", HN: "honduras",
  MX: "mexico", NI: "nicaragua", PA: "panama", PY: "paraguay",
  PE: "peru", PR: "puerto rico", ES: "spain", UY: "uruguay",
  VE: "venezuela", US: "united states",
};

/**
 * Context-aware query builder for web search.
 *
 * Design principles:
 * - One query per event category to guarantee diversity in results
 * - Only top 2 URLs per query → ~10 URLs total for Firecrawl extraction
 * - Colloquial: queries a real person would type into Google
 * - No date in queries — Tavily returns recent content naturally,
 *   the curator's Date Rule filters past/future events
 */

interface QueryContext {
  city: string;
  location: string;
  monthYear: string;
}

function buildQueryContext(city: string, country: string): QueryContext {
  const location = buildLocationString(city, country);
  const now = new Date();
  const monthYear = now.toLocaleDateString("es", { month: "long", year: "numeric" });
  return { city, location, monthYear };
}

/** How many Tavily results to keep per query — top 4 for better source diversity */
export const RESULTS_PER_QUERY = 4;

const SECTION_QUERIES: Record<RelaxSection, (ctx: QueryContext) => string[]> = {
  activities: ({ location, monthYear }) => [
    `agenda cultural ${location} ${monthYear}`,
    `cartelera cine y teatro ${location}`,
    `recitales shows música en vivo ${location} ${monthYear}`,
    `ferias exposiciones museos ${location} ${monthYear}`,
    `qué hacer ${location} ${monthYear}`,
  ],
  restaurants: ({ location, monthYear }) => [
    `dónde comer ${location} recomendados`,
    `mejores restaurantes y bares ${location} ${monthYear}`,
    `cafés cervecerías heladerías ${location} recomendados`,
  ],
};

// ============================================
// Shared helpers
// ============================================

export function buildLocationString(city: string, country: string): string {
  const countryName = ISO_TO_COUNTRY_NAME[country.toUpperCase()] ?? country;
  return countryName ? `${city}, ${countryName}` : city;
}

export function buildCacheKey(city: string, section: RelaxSection): string {
  return `${section}:${city.toLowerCase().trim()}`;
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ============================================
// Post-search geo filter
// ============================================

/**
 * TLD and URL-path patterns that unambiguously signal a wrong country.
 * Only hard signals — no content scanning (too many false positives).
 */
const WRONG_COUNTRY_URL_SIGNALS: Record<string, {
  tlds: string[];
  urlPatterns: RegExp[];
}> = {
  ES: {
    tlds: [".es"],
    urlPatterns: [
      /\/espana\b/i, /\/spain\b/i,
      /\/andaluc[ií]a\b/i, /\/andalusia\b/i,
      /\/cordoba-spain/i, /\/cordoba-espana/i,
      /turismodecordoba\.org/i, /andalucia\.org/i,
    ],
  },
};

/** Drop results whose URL clearly belongs to a different country. */
function filterWrongCountryResults(
  results: WebSearchResult[],
  userCountry: string
): WebSearchResult[] {
  const signals = Object.entries(WRONG_COUNTRY_URL_SIGNALS)
    .filter(([code]) => code !== userCountry.toUpperCase())
    .map(([, s]) => s);

  if (signals.length === 0) return results;

  return results.filter((r) => {
    const host = extractDomain(r.url);
    for (const s of signals) {
      if (s.tlds.some((tld) => host.endsWith(tld))) return false;
      if (s.urlPatterns.some((re) => re.test(r.url))) return false;
    }
    return true;
  });
}

// ============================================
// Provider detection
// ============================================

type WebSearchProvider = "tavily" | "serper" | "none";

function getWebSearchProvider(): WebSearchProvider {
  if (process.env.TAVILY_API_KEY) return "tavily";
  if (process.env.SERPER_API_KEY) return "serper";
  return "none";
}

// ============================================
// Main functions
// ============================================

/**
 * Search + extract structured events via Tavily + Firecrawl.
 * Both activities and restaurants use the same pipeline:
 *   Tavily search → Firecrawl LLM extract → geo filter
 * Section-specific excludeDomains prevent irrelevant sources.
 */
export async function searchAndExtractLocalEvents(
  city: string,
  country: string,
  section: RelaxSection
): Promise<SearchAndExtractResult> {
  const cacheKey = buildCacheKey(city, section);
  const provider = getWebSearchProvider();
  if (provider === "none") return { searchResults: [], extractedEvents: [] };

  const countryUpper = country.toUpperCase();
  const ctx = buildQueryContext(city, country);
  const queries = SECTION_QUERIES[section](ctx);
  const excludeDomains = section === "activities"
    ? EXCLUDED_DOMAINS_ACTIVITIES
    : EXCLUDED_DOMAINS_RESTAURANTS;

  console.log(`[web-search] ${section} queries:`, JSON.stringify(queries));

  if (provider === "tavily") {
    const tavilyCountry = ISO_TO_TAVILY_COUNTRY[countryUpper];
    const raw = await searchAndExtract(queries, cacheKey, tavilyCountry, RESULTS_PER_QUERY, excludeDomains);

    console.log(`[web-search] Tavily: ${raw.searchResults.length} search results, ${raw.extractedEvents.length} extracted events`);

    const filteredSearch = filterWrongCountryResults(raw.searchResults, countryUpper);
    const filteredUrls = new Set(filteredSearch.map((r) => r.url));
    const filteredEvents = raw.extractedEvents.filter((e) => filteredUrls.has(e.sourceUrl));

    console.log(`[web-search] After geo filter: ${filteredSearch.length} results, ${filteredEvents.length} events`);

    if (filteredSearch.length > 0) {
      return { searchResults: filteredSearch, extractedEvents: filteredEvents };
    }

    // Tavily returned nothing — try Serper fallback (search-only, no extraction)
    if (process.env.SERPER_API_KEY) {
      console.warn("[web-search] Tavily returned no results, falling back to Serper");
      const serperRaw = await searchWithSerper(queries, cacheKey, countryUpper.toLowerCase());
      const serperFiltered = filterWrongCountryResults(serperRaw, countryUpper);
      return { searchResults: serperFiltered, extractedEvents: [] };
    }
    return { searchResults: [], extractedEvents: [] };
  }

  // provider === "serper" (search-only, no extraction)
  const serperResults = await searchWithSerper(queries, cacheKey, countryUpper.toLowerCase());
  const filtered = filterWrongCountryResults(serperResults, countryUpper);
  return { searchResults: filtered, extractedEvents: [] };
}

/**
 * Search-only — no Firecrawl extraction.
 * Used by grocery-advisor, deals-finder, and other consumers that only need URLs + snippets.
 */
export async function searchLocalEvents(
  city: string,
  country: string,
  section: RelaxSection
): Promise<WebSearchResult[]> {
  const provider = getWebSearchProvider();
  if (provider === "none") return [];

  const countryUpper = country.toUpperCase();
  const ctx = buildQueryContext(city, country);
  const queries = SECTION_QUERIES[section](ctx);
  const cacheKey = buildCacheKey(city, section);

  if (provider === "tavily") {
    const tavilyCountry = ISO_TO_TAVILY_COUNTRY[countryUpper];
    const rawResults = await searchWithTavily(queries, cacheKey, tavilyCountry);
    const results = filterWrongCountryResults(rawResults, countryUpper);

    if (results.length > 0) return results;

    if (process.env.SERPER_API_KEY) {
      const serperRaw = await searchWithSerper(queries, cacheKey, countryUpper.toLowerCase());
      return filterWrongCountryResults(serperRaw, countryUpper);
    }
    return [];
  }

  const serperResults = await searchWithSerper(queries, cacheKey, countryUpper.toLowerCase());
  return filterWrongCountryResults(serperResults, countryUpper);
}
