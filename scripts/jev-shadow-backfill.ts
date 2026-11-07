/**
 * Backfill Jev shadow judgments for already-curated cultural_events rows.
 *
 * Dry run by default: prints eligible count, an estimated input token total
 * (chars/4 heuristic, no network call), and the estimated USD cost at
 * $0.042 / 1M input tokens. Pass --send to actually call Jev and write
 * AiShadowJudgment rows.
 *
 * Usage:
 *   pnpm exec tsx scripts/jev-shadow-backfill.ts          # dry run
 *   pnpm exec tsx scripts/jev-shadow-backfill.ts --send   # send to Jev
 */

import { PrismaClient } from "@prisma/client";

import { askJev } from "../src/lib/ai/decide";
import {
  buildCuratorQuestions,
  buildCuratorState,
  buildShadowRow,
} from "../src/lib/events/pipeline/curator-shadow";
import { CULTURAL_EVENT_TAGS } from "../src/lib/events/pipeline/curate-events";

import type { ShadowRow } from "../src/lib/events/pipeline/curator-shadow";
import type { CuratedEvent } from "../src/lib/events/pipeline/types";
import type { CulturalEvent } from "@prisma/client";

const prisma = new PrismaClient();

const PRICE_PER_MILLION_INPUT_TOKENS_USD = 0.042;
const CONCURRENCY_LIMIT = 8;
const BACKFILL_TASK = "events.curator.backfill";
const VALID_CATEGORIES: readonly string[] = CULTURAL_EVENT_TAGS;

/** Rough chars/4 heuristic — no network call, just an order-of-magnitude estimate. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

type EligibleRow = Pick<
  CulturalEvent,
  | "title"
  | "description"
  | "startDate"
  | "venueName"
  | "address"
  | "category"
  | "tags"
  | "artists"
  | "priceMin"
  | "priceMax"
  | "sourceUrl"
  | "culturalCategory"
  | "culturalScore"
  | "originalityScore"
  | "editorialHighlight"
  | "finalScore"
>;

/**
 * Map a cultural_events row to the CuratedEvent shape so it can reuse
 * buildCuratorState/buildShadowRow exactly as the live pipeline does.
 *
 * categoryGuess isn't persisted as its own column; pipeline-sourced rows
 * store it as tags[0] (see run-pipeline.ts curatedEventToRawData), so that's
 * the closest reconstruction available. culturalCategory is written as-is
 * from CuratedEvent.culturalCategory (one of CULTURAL_EVENT_TAGS), so no
 * remapping is needed there — it's filtered by VALID_CATEGORIES above.
 */
function rowToCuratedEvent(row: EligibleRow): CuratedEvent {
  return {
    title: row.title,
    date: row.startDate ? row.startDate.toISOString().slice(0, 10) : "",
    time: null,
    venue: row.venueName ?? "",
    address: row.address,
    categoryGuess: row.tags[0] ?? row.category.toLowerCase(),
    description: row.description ?? "",
    priceMin: row.priceMin,
    priceMax: row.priceMax,
    artists: row.artists,
    sourceUrl: row.sourceUrl ?? "",
    culturalCategory: row.culturalCategory!,
    culturalScore: row.culturalScore!,
    originalityScore: row.originalityScore ?? 0,
    editorialHighlight: row.editorialHighlight ?? "",
    finalScore: row.finalScore ?? 0,
  };
}

async function loadEligibleEvents(): Promise<CuratedEvent[]> {
  const rows = await prisma.culturalEvent.findMany({
    where: {
      culturalCategory: { in: [...VALID_CATEGORIES] },
      culturalScore: { not: null },
    },
    select: {
      title: true,
      description: true,
      startDate: true,
      venueName: true,
      address: true,
      category: true,
      tags: true,
      artists: true,
      priceMin: true,
      priceMax: true,
      sourceUrl: true,
      culturalCategory: true,
      culturalScore: true,
      originalityScore: true,
      editorialHighlight: true,
      finalScore: true,
    },
  });

  return rows.map(rowToCuratedEvent);
}

async function runDryRun(events: CuratedEvent[], questions: ReturnType<typeof buildCuratorQuestions>): Promise<void> {
  const totalEstimatedTokens = events.reduce((sum, event) => {
    const payload = JSON.stringify({ state: buildCuratorState(event), questions });
    return sum + estimateTokens(payload);
  }, 0);
  const estimatedCostUsd = (totalEstimatedTokens / 1_000_000) * PRICE_PER_MILLION_INPUT_TOKENS_USD;

  console.log("[jev-backfill] DRY RUN (no requests sent)");
  console.log(`  Eligible events: ${events.length}`);
  console.log(`  Estimated input tokens: ${totalEstimatedTokens.toLocaleString("en-US")}`);
  console.log(`  Estimated cost: $${estimatedCostUsd.toFixed(4)} USD`);
  console.log("  Run again with --send to call Jev and write shadow rows.");
}

async function runSend(events: CuratedEvent[], questions: ReturnType<typeof buildCuratorQuestions>): Promise<void> {
  console.log(`[jev-backfill] SEND MODE — ${events.length} events`);

  const rows: ShadowRow[] = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < events.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const event = events[currentIndex];
      if (!event) continue;

      const requestStart = Date.now();
      const result = await askJev({
        task: BACKFILL_TASK,
        state: buildCuratorState(event),
        questions,
      });
      if (!result) continue;

      rows.push(
        buildShadowRow({
          task: BACKFILL_TASK,
          event,
          result,
          latencyMs: Date.now() - requestStart,
        }),
      );
    }
  }

  const workerCount = Math.min(CONCURRENCY_LIMIT, events.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  if (rows.length > 0) {
    await prisma.aiShadowJudgment.createMany({ data: rows });
  }

  console.log(`[jev-backfill] Wrote ${rows.length}/${events.length} shadow rows.`);
}

async function main(): Promise<void> {
  const send = process.argv.includes("--send");
  const events = await loadEligibleEvents();

  if (events.length === 0) {
    console.log("[jev-backfill] No eligible cultural_events rows found (need culturalCategory + culturalScore).");
    return;
  }

  const questions = buildCuratorQuestions();

  if (send) {
    await runSend(events, questions);
  } else {
    await runDryRun(events, questions);
  }
}

main()
  .catch((error) => {
    console.error("[jev-backfill] failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
