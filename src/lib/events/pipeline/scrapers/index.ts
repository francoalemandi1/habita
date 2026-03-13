/**
 * Scraper orchestrator — runs dedicated platform scrapers in parallel.
 *
 * Produces CrawledPage[] that merge with Tavily pages before DeepSeek extraction.
 * Max 3 concurrent fetches to avoid hammering platforms.
 * Never throws — always returns an array (possibly empty).
 */

import { fetchAndConvert } from "./html-to-markdown";
import { SCRAPER_PLATFORMS } from "./platforms";

import type { CrawledPage } from "../types";

// ============================================
// Constants
// ============================================

/** Max concurrent HTTP fetches across all platforms. */
const MAX_CONCURRENT_FETCHES = 3;

// ============================================
// Main function
// ============================================

/**
 * Run all configured platform scrapers for a city.
 * Returns CrawledPage[] ready for DeepSeek extraction.
 */
export async function runScrapers(city: string): Promise<CrawledPage[]> {
  // Collect all URLs from all platforms
  const tasks: Array<{ url: string; domain: string; platform: string }> = [];

  for (const platform of SCRAPER_PLATFORMS) {
    const urls = platform.buildUrls(city);
    for (const url of urls) {
      tasks.push({ url, domain: platform.domain, platform: platform.name });
    }
  }

  if (tasks.length === 0) {
    console.log(`[scrapers] No platform URLs for "${city}"`);
    return [];
  }

  // Fetch in batches with concurrency limit
  const pages: CrawledPage[] = [];

  for (let i = 0; i < tasks.length; i += MAX_CONCURRENT_FETCHES) {
    const batch = tasks.slice(i, i + MAX_CONCURRENT_FETCHES);

    const results = await Promise.all(
      batch.map(async ({ url, domain, platform }) => {
        const page = await fetchAndConvert(url, domain);
        if (page) {
          console.log(`[scrapers] OK ${platform}: ${url} (${page.markdown.length} chars)`);
        }
        return page;
      }),
    );

    for (const result of results) {
      if (result) pages.push(result);
    }
  }

  console.log(
    `[scrapers] ${pages.length}/${tasks.length} pages scraped for "${city}" ` +
    `(${SCRAPER_PLATFORMS.length} platforms)`,
  );

  return pages;
}
