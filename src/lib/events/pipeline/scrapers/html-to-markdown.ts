/**
 * Generic HTML → markdown converter for event scraping.
 *
 * Strategy: fetch HTML, strip noise with cheerio (script, style, nav, footer,
 * ads, cookie banners), then convert to markdown with turndown.
 * Let DeepSeek handle the actual event extraction — no fragile CSS selectors.
 */

import * as cheerio from "cheerio";
import TurndownService from "turndown";

import type { CrawledPage } from "../types";

// ============================================
// Constants
// ============================================

/** Timeout per URL fetch (ms). */
const FETCH_TIMEOUT_MS = 10_000;

/** Minimum markdown length to be considered useful content. */
const MIN_CONTENT_LENGTH = 200;

/** In-memory cache TTL (6 hours — matches VTEX client pattern). */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// ============================================
// Cache
// ============================================

interface CacheEntry {
  html: string;
  expiresAt: number;
}

const htmlCache = new Map<string, CacheEntry>();

// ============================================
// Noise selectors to remove before conversion
// ============================================

const NOISE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "nav",
  "footer",
  "header",
  "aside",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
  ".cookie-banner",
  ".cookie-consent",
  "#cookie-banner",
  ".advertisement",
  ".ad-container",
  ".social-share",
  ".newsletter-signup",
  ".fb-like",
  ".twitter-share",
].join(", ");

// ============================================
// Turndown instance
// ============================================

function createTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  // Remove images — DeepSeek doesn't need them, saves tokens
  td.addRule("removeImages", {
    filter: "img",
    replacement: () => "",
  });

  return td;
}

// ============================================
// Main function
// ============================================

/**
 * Fetch a URL, strip HTML noise, convert to markdown.
 * Returns null if fetch fails or content is too short (likely SPA shell).
 * Uses 6-hour in-memory cache to avoid re-fetching within pipeline window.
 */
export async function fetchAndConvert(
  url: string,
  domain: string,
): Promise<CrawledPage | null> {
  try {
    const html = await fetchWithCache(url);
    if (!html) return null;

    const markdown = htmlToMarkdown(html);
    if (markdown.length < MIN_CONTENT_LENGTH) {
      console.log(`[scraper] SKIP (${markdown.length} chars) ${url}`);
      return null;
    }

    return { url, domain, markdown };
  } catch (error) {
    console.warn(
      `[scraper] Failed ${url}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

// ============================================
// Fetch with cache
// ============================================

async function fetchWithCache(url: string): Promise<string | null> {
  const cached = htmlCache.get(url);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.html;
  }
  htmlCache.delete(url);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-AR,es;q=0.9",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });

  if (!response.ok) {
    console.warn(`[scraper] HTTP ${response.status} for ${url}`);
    return null;
  }

  const html = await response.text();

  htmlCache.set(url, { html, expiresAt: Date.now() + CACHE_TTL_MS });

  return html;
}

// ============================================
// HTML → Markdown
// ============================================

function htmlToMarkdown(html: string): string {
  const $ = cheerio.load(html);

  // Remove noise elements
  $(NOISE_SELECTORS).remove();

  // Use body content only
  const body = $("body").html() ?? $.html();

  const td = createTurndown();
  let markdown = td.turndown(body);

  // Post-processing: collapse excessive whitespace
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

  return markdown;
}
