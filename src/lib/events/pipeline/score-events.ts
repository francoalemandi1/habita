/**
 * Stage 9: DeepSeek cultural scoring.
 *
 * Evaluates cultural value of events. Does NOT modify factual data.
 * Temperature ≤ 0.4 for slightly more creative editorial highlights.
 * Fallback: neutral scores (5.0) if LLM fails.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { getDeepSeekModel } from "@/lib/llm/deepseek-provider";

import type { ScoredEventWithId, ScoredEvent } from "./types";

// ============================================
// Constants
// ============================================

/** DeepSeek scoring temperature — slightly higher than extraction. */
const SCORING_TEMPERATURE = 0.4;

/** Events per LLM call (batched for cost efficiency). */
const SCORING_BATCH_SIZE = 10;

/** Source reliability score (0-10) for final_score calculation. */
const DEFAULT_SOURCE_RELIABILITY = 7;

// ============================================
// Zod schema (strict JSON output)
// ============================================

const scoredEventSchema = z.object({
  cultural_category: z.string().describe("Granular category: 'Teatro', 'Música en vivo', 'Cine arte', 'Exposición', 'Festival', 'Taller', etc."),
  cultural_interest_score: z.number().min(0).max(10).describe("0-10. 0-3=low relevance, 4-6=standard, 7-8=notable, 9-10=exceptional. Be conservative."),
  originality_score: z.number().min(0).max(10).describe("0-10. How original/unique is this event compared to standard programming?"),
  commercial_vs_independent: z.enum(["commercial", "independent", "mixed"]).describe("Is this a commercial venue/event or independent/cultural?"),
  editorial_highlight: z.string().describe("Max 40 words. One factual sentence about why this event is noteworthy. Never promotional."),
});

const batchScoringSchema = z.object({
  scores: z.array(z.object({
    event_index: z.number().describe("Zero-based index of the event in the input list"),
    ...scoredEventSchema.shape,
  })),
});

// ============================================
// System prompt
// ============================================

const SCORING_SYSTEM_PROMPT = `You are a cultural curator.

Evaluate the following events for cultural value.

DO NOT modify factual data.
DO NOT rewrite title, date, venue, or description.
Only evaluate cultural value.

Scoring guidelines:
0-2 → low cultural relevance (purely commercial, generic chain cinema, imported blockbuster)
3-4 → standard commercial programming (mainstream cinema, large commercial venue)
5-6 → good standard programming (quality theater, notable artists, established venues)
7-8 → culturally notable (independent productions, community events, unique experiences, local artists)
9-10 → exceptional (landmark event, internationally recognized artist, rare opportunity, free public events of high quality)

Distribute scores across the full range — avoid clustering everything in 4-6.
Events with free admission, community focus, or independent production deserve higher scores.
The editorial_highlight must be factual and max 40 words.

Return STRICT JSON only. No markdown, no explanations.`;

// ============================================
// Types (input)
// ============================================

export interface EventToScore {
  id: string;
  title: string;
  description: string | null;
  venueName: string | null;
  category: string;
}

// ============================================
// Main function
// ============================================

/**
 * Score events for cultural value using DeepSeek.
 * Processes in batches of SCORING_BATCH_SIZE.
 * Returns scored events with computed finalScore.
 */
export async function scoreEvents(
  events: EventToScore[],
  sourceReliability?: number,
): Promise<ScoredEventWithId[]> {
  if (events.length === 0) return [];

  const reliability = sourceReliability ?? DEFAULT_SOURCE_RELIABILITY;
  const results: ScoredEventWithId[] = [];

  for (let i = 0; i < events.length; i += SCORING_BATCH_SIZE) {
    const batch = events.slice(i, i + SCORING_BATCH_SIZE);

    try {
      const scored = await scoreBatch(batch, reliability);
      results.push(...scored);
    } catch (error) {
      console.warn(`[score-events] Batch ${Math.floor(i / SCORING_BATCH_SIZE)} failed, using fallback scores:`, error instanceof Error ? error.message : error);
      // Fallback: neutral scores for the entire failed batch
      results.push(...batch.map((e) => buildFallbackScore(e.id, reliability)));
    }
  }

  console.log(`[score-events] Scored ${results.length}/${events.length} events`);
  return results;
}

// ============================================
// Batch scoring
// ============================================

async function scoreBatch(
  events: EventToScore[],
  reliability: number,
): Promise<ScoredEventWithId[]> {
  const eventList = events
    .map((e, i) => `[${i}] "${e.title}" — ${e.venueName ?? "Venue desconocido"} — ${e.category}\n${e.description ?? "Sin descripción"}`)
    .join("\n\n");

  const model = getDeepSeekModel();
  const result = await generateObject({
    model,
    schema: batchScoringSchema,
    system: SCORING_SYSTEM_PROMPT,
    prompt: `Score these ${events.length} events:\n\n${eventList}`,
    temperature: SCORING_TEMPERATURE,
  });

  // Map scored results back to event IDs
  const scored: ScoredEventWithId[] = [];
  for (const score of result.object.scores) {
    const event = events[score.event_index];
    if (!event) continue;

    const scoring: ScoredEvent = {
      culturalCategory: score.cultural_category,
      culturalInterestScore: score.cultural_interest_score,
      originalityScore: score.originality_score,
      commercialVsIndependent: score.commercial_vs_independent,
      editorialHighlight: score.editorial_highlight.slice(0, 240),
    };

    scored.push({
      eventId: event.id,
      scoring,
      finalScore: computeFinalScore(scoring, reliability),
    });
  }

  // Fill in any events that were missed by the LLM
  for (const event of events) {
    if (!scored.some((s) => s.eventId === event.id)) {
      scored.push(buildFallbackScore(event.id, reliability));
    }
  }

  return scored;
}

// ============================================
// Helpers
// ============================================

function computeFinalScore(scoring: ScoredEvent, reliability: number): number {
  return Math.round(
    (0.5 * scoring.culturalInterestScore
      + 0.3 * scoring.originalityScore
      + 0.2 * reliability)
    * 100
  ) / 100;
}

function buildFallbackScore(eventId: string, reliability: number): ScoredEventWithId {
  const scoring: ScoredEvent = {
    culturalCategory: "Otro",
    culturalInterestScore: 5,
    originalityScore: 5,
    commercialVsIndependent: "mixed",
    editorialHighlight: "",
  };

  return {
    eventId,
    scoring,
    finalScore: computeFinalScore(scoring, reliability),
  };
}
