/**
 * Quick test: run all scrapers for a city and show what they return.
 * Usage: npx tsx scripts/test-scrapers.ts [city]
 */

import { SCRAPER_PLATFORMS } from "../src/lib/events/pipeline/scrapers/platforms";

// Inline fetch+convert to avoid path alias issues
import * as cheerio from "cheerio";
import TurndownService from "turndown";

const FETCH_TIMEOUT_MS = 10_000;
const MIN_CONTENT_LENGTH = 200;

const NOISE_SELECTORS = [
  "script", "style", "noscript", "iframe", "nav", "footer", "header", "aside",
  "[role='navigation']", "[role='banner']", "[role='contentinfo']",
  ".cookie-banner", ".cookie-consent", "#cookie-banner",
  ".advertisement", ".ad-container", ".social-share", ".newsletter-signup",
  ".fb-like", ".twitter-share",
].join(", ");

function htmlToMarkdown(html: string): string {
  const $ = cheerio.load(html);
  $(NOISE_SELECTORS).remove();
  const body = $("body").html() ?? $.html();
  const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
  td.addRule("removeImages", { filter: "img", replacement: () => "" });
  let markdown = td.turndown(body);
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();
  return markdown;
}

async function fetchAndConvert(url: string): Promise<{ markdown: string; length: number } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const markdown = htmlToMarkdown(html);
    return { markdown, length: markdown.length };
  } catch (error) {
    return null;
  }
}

// ── Main ──

async function main() {
  const city = process.argv[2] ?? "Buenos Aires";
  console.log(`\nTesting scrapers for "${city}"\n${"=".repeat(60)}\n`);

  for (const platform of SCRAPER_PLATFORMS) {
    const urls = platform.buildUrls(city);
    console.log(`\n${platform.name} (${platform.domain})`);
    console.log(`  URLs: ${urls.length}`);

    if (urls.length === 0) {
      console.log(`  No URLs for this city`);
      continue;
    }

    for (const url of urls) {
      process.stdout.write(`  ${url} ... `);
      const start = Date.now();
      const result = await fetchAndConvert(url);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      if (!result) {
        console.log(`FAILED (${elapsed}s)`);
        continue;
      }

      const useful = result.length >= MIN_CONTENT_LENGTH;
      const status = useful ? "OK" : "TOO SHORT";
      console.log(`${status} ${result.length} chars (${elapsed}s)`);

      if (useful) {
        const preview = result.markdown.slice(0, 500).replace(/\n/g, "\n      ");
        console.log(`      --- preview ---`);
        console.log(`      ${preview}`);
        console.log(`      ----------------`);
      }
    }
  }

  console.log(`\n${"=".repeat(60)}\nDone.\n`);
}

main().catch(console.error);
