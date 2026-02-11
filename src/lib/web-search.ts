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
export type RelaxSection = "culture" | "restaurants" | "weekend";

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
 * Multiple specific queries per section to get actionable data.
 * `location` includes city + country for disambiguation (e.g. "Córdoba, Argentina").
 */
export const SECTION_QUERIES: Record<RelaxSection, (location: string) => string[]> = {
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

  const location = buildLocationString(city, country);
  const queries = SECTION_QUERIES[section](location);
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
