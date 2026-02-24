/**
 * Unified web search module — orchestrates Tavily (primary) and Serper (fallback).
 *
 * Provider priority:
 *   1. Tavily (advanced search with rawContent + images) — 1000 credits/month free
 *   2. Serper (Google SERP snippets + images) — 2500 one-time credits free
 *
 * If Tavily returns empty results (quota exhausted, error), Serper is tried automatically.
 * Both providers return WebSearchResult[] — the downstream LLM pipeline handles
 * rawContent: null gracefully by falling back to snippet.
 */

import { searchWithTavily } from "./tavily";
import { searchWithSerper } from "./serper";

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

/**
 * Context-aware query builder for web search.
 *
 * Design principles:
 * - Colloquial: queries a real person would type into Google
 * - 2-3 keywords max per query (no keyword-stuffing)
 * - monthYear anchor ("febrero 2026") to get fresh content over evergreen lists
 * - 2-3 queries per section to stay within Tavily credit budget
 * - Activities: ephemeral events (movies, shows, exhibits, fairs, outdoor events)
 * - Restaurants: discovery (new, trending, curated — not static directories)
 */

interface QueryContext {
  location: string;
  monthYear: string;
  isWeekendNearby: boolean;
}

function buildQueryContext(city: string, country: string): QueryContext {
  const location = buildLocationString(city, country);
  const now = new Date();
  const monthYear = now.toLocaleDateString("es", { month: "long", year: "numeric" });
  const dayOfWeek = now.getDay();
  const isWeekendNearby = dayOfWeek === 0 || dayOfWeek >= 4; // thu-sun

  return { location, monthYear, isWeekendNearby };
}

const SECTION_QUERIES: Record<RelaxSection, (ctx: QueryContext) => string[]> = {
  activities: ({ location, monthYear, isWeekendNearby }) => [
    `agenda cultural ${location} ${monthYear}`,
    `cartelera cine y teatro ${location}`,
    `qué hacer ${location} ${isWeekendNearby ? "este fin de semana" : monthYear}`,
    `eventos y ferias ${location} ${monthYear}`,
  ],
  restaurants: ({ location, monthYear }) => [
    `dónde comer ${location} recomendados`,
    `nuevos restaurantes y bares ${location} ${monthYear}`,
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
// Provider detection
// ============================================

type WebSearchProvider = "tavily" | "serper" | "none";

function getWebSearchProvider(): WebSearchProvider {
  if (process.env.TAVILY_API_KEY) return "tavily";
  if (process.env.SERPER_API_KEY) return "serper";
  return "none";
}

// ============================================
// Main function
// ============================================

/**
 * Search for local events using the best available provider.
 * Tavily is preferred (richer content). Falls back to Serper if Tavily
 * returns no results (quota exhausted, API error, etc.).
 */
export async function searchLocalEvents(
  city: string,
  country: string,
  section: RelaxSection
): Promise<WebSearchResult[]> {
  const provider = getWebSearchProvider();
  if (provider === "none") return [];

  const ctx = buildQueryContext(city, country);
  const queries = SECTION_QUERIES[section](ctx);
  const cacheKey = buildCacheKey(city, section);

  if (provider === "tavily") {
    const results = await searchWithTavily(queries, cacheKey);
    if (results.length > 0) return results;

    // Tavily returned nothing — try Serper fallback
    if (process.env.SERPER_API_KEY) {
      console.warn("[web-search] Tavily returned no results, falling back to Serper");
      return searchWithSerper(queries, cacheKey);
    }
    return [];
  }

  // provider === "serper"
  return searchWithSerper(queries, cacheKey);
}
