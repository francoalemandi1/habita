/**
 * Stage 1: URL discovery + content via Tavily Search.
 *
 * Finds candidate URLs for cultural event listings in a given city
 * and fetches their markdown content in the same API call
 * (includeRawContent: "markdown"). Eliminates the need for Firecrawl.
 *
 * Cost: 2 credits per query (advanced search).
 */

import { tavily } from "@tavily/core";
import { extractDomain, ISO_TO_TAVILY_COUNTRY } from "@/lib/web-search";

import type { DiscoveredUrl } from "./types";

// ============================================
// Constants
// ============================================

/** Max results per query from Tavily. */
const RESULTS_PER_QUERY = 7;

/** Max unique URLs to return after dedup (raised to accommodate ticket platforms + gov sites). */
const MAX_DISCOVERY_URLS = 45;

/** Tavily search timeout per query (ms). */
const SEARCH_TIMEOUT_MS = 15_000;

/**
 * Domains excluded from Tavily results entirely.
 * Social, aggregators, tourism — same blocklist used in domain-filter.ts
 * but applied at the search level to save credits.
 */
const EXCLUDED_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "reddit.com",
  "wikipedia.org",
  "eventbrite.com",
  "eventbrite.com.ar",
  "meetup.com",
  "feverup.com",
  "tripadvisor.com",
  "tripadvisor.com.ar",
  "viator.com",
  "getyourguide.com",
  "civitatis.com",
  "despegar.com",
  "booking.com",
  "airbnb.com",
  // Global listing sites — no local event details
  "imdb.com",
  "songkick.com",
  "setlist.fm",
  "bandsintown.com",
  "last.fm",
  // Spanish sites (Córdoba España, not Argentina)
  "ecartelera.com",
  "ecartelera.es",
  "sensacine.com",
  "cinesur.com",
];

// ============================================
// Query templates (from master prompt)
// ============================================

function buildQueries(city: string): string[] {
  return [
    `${city} secretaría de cultura sitio oficial`,
    `${city} agenda cultural sitio oficial`,
    `${city} centro cultural programación`,
    `${city} teatro oficial programación`,
    `${city} museo programación oficial`,
    `${city} cine cartelera oficial`,
  ];
}

// ============================================
// Main function
// ============================================

/**
 * Discover candidate URLs for cultural events in a city.
 * Runs multiple Tavily queries in parallel, deduplicates by URL, returns top N.
 */
export async function discoverUrls(
  city: string,
  country: string
): Promise<DiscoveredUrl[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("[discover-urls] No TAVILY_API_KEY — returning empty");
    return [];
  }

  const client = tavily({ apiKey });
  const queries = buildQueries(city);
  const countryCode = ISO_TO_TAVILY_COUNTRY[country.toUpperCase()];

  // Run all queries in parallel
  const batchResults = await Promise.all(
    queries.map((query) => runSearch(client, query, countryCode))
  );

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const deduped: DiscoveredUrl[] = [];

  for (const batch of batchResults) {
    for (const result of batch) {
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        deduped.push(result);
      }
    }
  }

  // Diversify: round-robin by domain so the crawl limit doesn't
  // eat all slots with URLs from the same 2-3 government sites.
  const results = diversifyByDomain(deduped, MAX_DISCOVERY_URLS);

  const withContent = results.filter((r) => r.rawContent).length;
  console.log(`[discover-urls] ${city}: ${results.length} unique URLs (${withContent} with content) from ${queries.length} queries`);
  return results;
}

// ============================================
// Search helper
// ============================================

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  rawContent?: string;
}

async function runSearch(
  client: ReturnType<typeof tavily>,
  query: string,
  country?: string
): Promise<DiscoveredUrl[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

    const response = await client.search(query, {
      searchDepth: "advanced",
      includeRawContent: "markdown",
      maxResults: RESULTS_PER_QUERY,
      topic: "general",
      excludeDomains: EXCLUDED_DOMAINS,
      ...(country && { country }),
    });
    clearTimeout(timeout);

    return (response.results as TavilySearchResult[])
      .filter((r) => r.title && r.url)
      .map((r) => ({
        url: r.url,
        domain: extractDomain(r.url),
        title: r.title,
        snippet: r.content?.slice(0, 300) ?? "",
        rawContent: r.rawContent ?? null,
      }));
  } catch (error) {
    console.warn(`[discover-urls] Query "${query}" failed:`, error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Round-robin URLs by domain: take 1 URL per domain before taking
 * a second from any domain. Ensures domain diversity in the top N
 * so the crawl limit covers more sources.
 */
function diversifyByDomain(urls: DiscoveredUrl[], max: number): DiscoveredUrl[] {
  const byDomain = new Map<string, DiscoveredUrl[]>();
  for (const url of urls) {
    const list = byDomain.get(url.domain);
    if (list) {
      list.push(url);
    } else {
      byDomain.set(url.domain, [url]);
    }
  }

  const result: DiscoveredUrl[] = [];
  const domains = Array.from(byDomain.keys());
  let round = 0;

  while (result.length < max) {
    let added = false;
    for (const domain of domains) {
      if (result.length >= max) break;
      const list = byDomain.get(domain)!;
      if (round < list.length) {
        result.push(list[round]!);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }

  return result;
}
