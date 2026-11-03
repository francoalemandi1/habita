/**
 * Jev shadow curator — SHADOW MODE ONLY.
 *
 * Runs Jev (TypeSafe AI System One) alongside the DeepSeek curator for
 * comparison, writing `AiShadowJudgment` rows. Never changes a curated
 * event's category or scores, and never blocks the pipeline: every
 * failure is caught and logged.
 *
 * Disabled unless JEV_SHADOW_CURATOR=on and a TypeSafe API key is present.
 */

import { choice, score } from "@typesafe-ai/sdk";

import { askJev, isJevEnabled } from "@/lib/ai/decide";
import { prisma } from "@/lib/prisma";

import type { SystemOneResult } from "@typesafe-ai/sdk";
import type { Prisma } from "@prisma/client";
import type { CulturalEventTag } from "./curate-events";
import type { CuratedEvent } from "./types";

// ============================================
// Constants
// ============================================

const CURATOR_SHADOW_TASK = "events.curator";
const CONCURRENCY_LIMIT = 8;
const BUDGET_MS = 45_000;
const STATE_DESCRIPTION_MAX_LENGTH = 1500;

// ============================================
// Question definitions (mirrors buildCuratorPrompt's rubric and mapping guide)
// ============================================

const CATEGORY_DESCRIPTIONS: Record<CulturalEventTag, string> = {
  CINE: "Films, screenings, documentaries, cinema",
  TEATRO: "Theater, plays, stand-up, comedy, monologues",
  MUSICA: "Concerts, recitals, live music, DJ sets, electronic",
  DANZA: "Dance, ballet, contemporary, tango",
  EXPOSICION: "Exhibitions, galleries, visual art, photography",
  TALLER: "Workshops, courses, classes, talks, book presentations",
  FERIA: "Fairs, markets, bazaars",
  FESTIVAL: "Festivals, multi-day events, carnivals",
  INFANTIL: "Children's events, family activities",
  OTRO: "Anything that doesn't fit the categories above",
};

const CULTURAL_INTEREST_LEVELS = [
  "Low cultural relevance: purely commercial, generic chain cinema, imported blockbuster",
  "Standard commercial programming: mainstream cinema, large commercial venue",
  "Good standard programming: quality theater, notable artists, established venues",
  "Culturally notable: independent productions, community events, unique experiences, local artists",
  "Exceptional: landmark event, internationally recognized artist, rare opportunity, free public event of high quality",
] as const;

const ORIGINALITY_LEVELS = [
  "Generic, repeated, mass-market: identical to countless other events",
  "Common: little differentiation from similar events in the city",
  "Somewhat distinctive: some unique elements but not rare",
  "Original: distinctive format, lineup, or concept rarely seen",
  "Unique or rare opportunity: one-of-a-kind event unlikely to repeat",
] as const;

/** Build the three typed questions sent to Jev for every curated event. */
export function buildCuratorQuestions() {
  return {
    category: choice(
      "Pick the single category that best matches this cultural event.",
      CATEGORY_DESCRIPTIONS,
    ),
    culturalInterest: score(
      "Rate the cultural interest of this event using the rubric levels, from low to exceptional.",
      CULTURAL_INTEREST_LEVELS,
    ),
    originality: score(
      "Rate how original or rare this event is compared to typical programming in its city, from generic to a rare opportunity.",
      ORIGINALITY_LEVELS,
    ),
  };
}

type CuratorQuestions = ReturnType<typeof buildCuratorQuestions>;

/** State (event data) sent to Jev. Data stays in Spanish; only instructions/criteria are English. */
export interface CuratorEventState {
  [key: string]: string;
  title: string;
  venue: string;
  categoryGuess: string;
  date: string;
  description: string;
}

/** Build the state (event data) sent to Jev. Data stays in Spanish; only instructions/criteria are English. */
export function buildCuratorState(event: CuratedEvent): CuratorEventState {
  return {
    title: event.title,
    venue: event.venue,
    categoryGuess: event.categoryGuess,
    date: event.date,
    description: event.description.slice(0, STATE_DESCRIPTION_MAX_LENGTH),
  };
}

/** Map a 0-10 DeepSeek score to the same 0-4 band space Jev's score questions use. */
export function scoreToBand(score0to10: number): 0 | 1 | 2 | 3 | 4 {
  const rounded = Math.round(score0to10);
  if (rounded <= 2) return 0;
  if (rounded <= 4) return 1;
  if (rounded <= 6) return 2;
  if (rounded <= 8) return 3;
  return 4;
}

// ============================================
// Shadow run
// ============================================

export interface ShadowRow {
  task: string;
  subjectKey: string;
  subject: Prisma.InputJsonValue;
  primary: Prisma.InputJsonValue;
  shadow: Prisma.InputJsonValue;
  shadowModel: string;
  latencyMs: number;
  inputTokens: number | null;
}

/**
 * Run the Jev shadow curator over DeepSeek-curated events.
 * No-op unless JEV_SHADOW_CURATOR=on and a TypeSafe API key is present.
 * Never throws and never mutates `events`.
 */
export async function runCuratorShadow(events: CuratedEvent[], city: string): Promise<void> {
  if (process.env.JEV_SHADOW_CURATOR !== "on" || !isJevEnabled()) return;
  if (events.length === 0) return;

  try {
    const rows = await collectShadowRows(events, city);
    if (rows.length > 0) {
      await prisma.aiShadowJudgment.createMany({ data: rows });
    }
  } catch (error) {
    console.error("[curator-shadow] failed:", error instanceof Error ? error.message : error);
  }
}

async function collectShadowRows(events: CuratedEvent[], city: string): Promise<ShadowRow[]> {
  const start = Date.now();
  const questions = buildCuratorQuestions();
  const rows: ShadowRow[] = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < events.length) {
      if (Date.now() - start > BUDGET_MS) return;

      const currentIndex = nextIndex;
      nextIndex += 1;
      const event = events[currentIndex];
      if (!event) continue;

      const requestStart = Date.now();
      const result = await askJev({
        task: CURATOR_SHADOW_TASK,
        state: buildCuratorState(event),
        questions,
      });
      if (!result) continue;

      rows.push(buildShadowRow({ task: CURATOR_SHADOW_TASK, event, city, result, latencyMs: Date.now() - requestStart }));
    }
  }

  const workerCount = Math.min(CONCURRENCY_LIMIT, events.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return rows;
}

export interface BuildShadowRowParams {
  task: string;
  event: CuratedEvent;
  city?: string;
  result: SystemOneResult<CuratorQuestions>;
  latencyMs: number;
}

/** Build an `AiShadowJudgment` row from a Jev answer. Shared by the pipeline and the backfill script. */
export function buildShadowRow({ task, event, city, result, latencyMs }: BuildShadowRowParams): ShadowRow {
  return {
    task,
    subjectKey: `${event.title}|${event.date}|${event.venue}`,
    subject: city ? { ...buildCuratorState(event), city } : buildCuratorState(event),
    primary: {
      category: event.culturalCategory,
      culturalScore: event.culturalScore,
      originalityScore: event.originalityScore,
    },
    shadow: {
      category: result.answers.category.choice,
      categoryConfidence: result.answers.category.confidence,
      categoryProbabilities: result.answers.category.probabilities,
      culturalBand: Math.round(result.answers.culturalInterest.score),
      culturalConfidence: result.answers.culturalInterest.confidence,
      originalityBand: Math.round(result.answers.originality.score),
      originalityConfidence: result.answers.originality.confidence,
    },
    shadowModel: result.model,
    latencyMs,
    inputTokens: result.usage.input_tokens,
  };
}

export type { CuratorQuestions };
