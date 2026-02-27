/**
 * Stage 3: Content crawling via Firecrawl.
 *
 * Scrapes each URL to markdown using Firecrawl's standard scrape (1 credit/URL).
 * JS rendering is handled by Firecrawl — no local Playwright needed.
 * Markdown is truncated to stay within DeepSeek's context window budget.
 */

import { batchScrapeToMarkdown } from "@/lib/firecrawl";
import { extractDomain } from "@/lib/web-search";

import type { DiscoveredUrl, CrawledPage } from "./types";

// ============================================
// Constants
// ============================================

/** Max characters of markdown per page for DeepSeek extraction context. */
const MARKDOWN_MAX_CHARS = 8_000;

/** Max pages to crawl per pipeline run (controls Firecrawl credit usage). */
const MAX_CRAWL_PAGES = 25;

/** Concurrency for Firecrawl scraping. */
const CRAWL_CONCURRENCY = 3;

// ============================================
// Main function
// ============================================

/**
 * Crawl discovered URLs and return markdown content.
 * Caps at MAX_CRAWL_PAGES to control Firecrawl credit usage.
 */
export async function crawlPages(
  urls: DiscoveredUrl[],
  maxPages?: number,
): Promise<CrawledPage[]> {
  const limit = maxPages ?? MAX_CRAWL_PAGES;
  const urlsToCrawl = urls.slice(0, limit).map((u) => u.url);

  console.log(`[crawl-pages] Crawling ${urlsToCrawl.length} URLs (limit: ${limit})`);

  const scrapeResults = await batchScrapeToMarkdown(urlsToCrawl, CRAWL_CONCURRENCY);

  const pages: CrawledPage[] = scrapeResults.map((result) => ({
    url: result.url,
    domain: extractDomain(result.url),
    markdown: truncateMarkdown(result.markdown),
  }));

  console.log(`[crawl-pages] Got ${pages.length}/${urlsToCrawl.length} pages with content`);
  return pages;
}

// ============================================
// Helpers
// ============================================

function truncateMarkdown(markdown: string): string {
  if (markdown.length <= MARKDOWN_MAX_CHARS) return markdown;
  // Truncate at last newline before limit to avoid breaking mid-sentence
  const truncated = markdown.slice(0, MARKDOWN_MAX_CHARS);
  const lastNewline = truncated.lastIndexOf("\n");
  return lastNewline > MARKDOWN_MAX_CHARS * 0.8
    ? truncated.slice(0, lastNewline)
    : truncated;
}
