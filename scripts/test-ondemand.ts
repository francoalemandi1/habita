import { searchExa, extractEventsFromContent } from "../src/lib/events/providers/exa-provider";
import { PrismaClient } from "@prisma/client";

const CONTENT_MAX_CHARS = 2000;

async function main() {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) { console.log("No EXA_API_KEY"); return; }

  const queries = [
    "agenda cultural Córdoba argentina febrero 2026",
    "eventos actividades qué hacer Córdoba argentina febrero 2026",
  ];

  for (const query of queries) {
    console.log(`\n=== Query: "${query}" ===`);
    const results = await searchExa(apiKey, query, AbortSignal.timeout(30000));
    console.log(`Got ${results.length} results, ${results.filter(r => r.text).length} with text`);

    for (const r of results) {
      console.log(`  - ${r.title.slice(0, 60)}: ${r.text ? r.text.length + " chars" : "no text"}`);
    }

    const contentBlock = results
      .filter((r) => r.text || r.highlights?.length)
      .map((r) => {
        const content = r.text
          ? r.text.slice(0, CONTENT_MAX_CHARS)
          : (r.highlights ?? []).join("\n");
        return `## ${r.title}\nFuente: ${r.url}\n${content}`;
      })
      .join("\n\n---\n\n");

    if (!contentBlock.trim()) { console.log("No usable content"); continue; }

    console.log(`Content block: ${contentBlock.length} chars, extracting...`);
    try {
      const extracted = await extractEventsFromContent(contentBlock, query, results, AbortSignal.timeout(45000));
      console.log(`Extracted ${extracted.length} events:`);
      for (const e of extracted) {
        console.log(`  [${e.category ?? "?"}] ${e.title} | ${e.startDate ?? "no date"} | ${e.cityName ?? "no city"}`);
      }
    } catch (error) {
      console.error("Extraction error:", error);
    }
  }
}

main().catch(console.error);
