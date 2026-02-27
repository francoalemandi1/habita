/**
 * Stage 2: Domain filtering — deterministic removal of irrelevant domains.
 *
 * Removes social media, aggregators, tourism sites, generic portals,
 * homepages, and wrong-country URLs from the discovery results.
 * No API calls, no LLM — pure deterministic filtering.
 */

import type { DiscoveredUrl } from "./types";

// ============================================
// Blocklists
// ============================================

/** Social media platforms — never contain structured event data. */
const SOCIAL_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "tiktok.com",
  "reddit.com",
  "linkedin.com",
  "threads.net",
];

/**
 * Generic aggregators — no structured local event data worth crawling.
 * NOTE: Ticketek, Passline, AllAccess, Autoentrada are NOT blocked —
 * they have structured event listings with dates, venues, and prices.
 */
const AGGREGATOR_DOMAINS = [
  "eventbrite.com",
  "eventbrite.com.ar",
  "meetup.com",
  "feverup.com",
  // Global listing sites — no local details (addresses, prices, Spanish descriptions)
  "imdb.com",
  "songkick.com",
  "setlist.fm",
  "bandsintown.com",
  "last.fm",
];

/** Tourism/travel sites — never have real local event data with dates. */
const TOURISM_DOMAINS = [
  "tripadvisor.com",
  "tripadvisor.com.ar",
  "viator.com",
  "getyourguide.com",
  "civitatis.com",
  "klook.com",
  "tiqets.com",
  "musement.com",
  "despegar.com",
  "booking.com",
  "airbnb.com",
  "tangol.com",
  "welcomeargentina.com",
  "minube.com",
  "lonelyplanet.com",
];

/** Generic portals — too broad to be useful. */
const GENERIC_DOMAINS = [
  "wikipedia.org",
  "google.com",
  "google.com.ar",
];

/** Combined blocklist — checked via domain suffix matching. */
const BLOCKED_DOMAINS = [
  ...SOCIAL_DOMAINS,
  ...AGGREGATOR_DOMAINS,
  ...TOURISM_DOMAINS,
  ...GENERIC_DOMAINS,
];

/**
 * TLD and URL-path patterns that unambiguously signal a wrong country.
 * Only hard signals — no content scanning.
 */
const WRONG_COUNTRY_PATTERNS: RegExp[] = [
  /\.es$/i,
  /\/espana\b/i,
  /\/spain\b/i,
  /\/andaluc[ií]a\b/i,
  /\/cordoba-spain/i,
  /\/cordoba-espana/i,
  /turismodecordoba\.org/i,
  /andalucia\.org/i,
  /diariocordoba\.com/i,
  // Spanish cinema/event sites
  /ecartelera\.com/i,
  /ecartelera\.es/i,
  /sensacine\.com/i,
  /cinesur\.com/i,
];

// ============================================
// Main function
// ============================================

/**
 * Filter discovered URLs: remove blocked domains, homepages, wrong-country.
 * Pure function — no API calls, no side effects.
 */
export function filterDomains(urls: DiscoveredUrl[]): DiscoveredUrl[] {
  return urls.filter((entry) => {
    // Block known irrelevant domains
    if (isBlockedDomain(entry.domain)) return false;

    // Block homepage URLs (path = "/" or empty)
    if (isHomepageUrl(entry.url)) return false;

    // Block wrong-country URLs (Spain when we want Argentina)
    if (isWrongCountryUrl(entry.url, entry.domain)) return false;

    return true;
  });
}

// ============================================
// Helpers
// ============================================

function isBlockedDomain(domain: string): boolean {
  const normalized = domain.toLowerCase();
  return BLOCKED_DOMAINS.some(
    (blocked) => normalized === blocked || normalized.endsWith(`.${blocked}`)
  );
}

function isHomepageUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/$/, "");
    return path === "";
  } catch {
    return false;
  }
}

function isWrongCountryUrl(url: string, domain: string): boolean {
  return WRONG_COUNTRY_PATTERNS.some(
    (pattern) => pattern.test(url) || pattern.test(domain)
  );
}
