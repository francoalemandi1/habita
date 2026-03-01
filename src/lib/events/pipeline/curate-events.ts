/**
 * Stage 5: DeepSeek cultural curator — batch scoring + highlights.
 *
 * Receives all filtered events as a JSON array and returns
 * cultural scoring, editorial highlights, and granular categories.
 *
 * This replaces the old separate scoring phase (Phase B).
 * Temperature 0.4 for slightly creative editorial highlights.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { getDeepSeekModel } from "@/lib/llm/deepseek-provider";

import type { FilteredEvent, CuratedEvent } from "./types";

// ============================================
// Constants
// ============================================

const CURATOR_TEMPERATURE = 0.4;
const CURATOR_BATCH_SIZE = 25;
const DEFAULT_SOURCE_RELIABILITY = 7;

/** Stable set of event tags the curator must output. Enforced via z.enum(). */
export const CULTURAL_EVENT_TAGS = [
  "CINE", "TEATRO", "MUSICA", "DANZA", "EXPOSICION",
  "TALLER", "FERIA", "FESTIVAL", "INFANTIL", "OTRO",
] as const;

export type CulturalEventTag = (typeof CULTURAL_EVENT_TAGS)[number];

// ============================================
// Zod schema (strict JSON output)
// ============================================

const curatorSchema = z.object({
  events: z.array(z.object({
    event_index: z.number().describe("Zero-based index of the event in the input list"),
    cultural_category: z.enum(CULTURAL_EVENT_TAGS).describe(
      "Pick exactly one: CINE, TEATRO, MUSICA, DANZA, EXPOSICION, TALLER, FERIA, FESTIVAL, INFANTIL, OTRO",
    ),
    cultural_score: z.number().min(0).max(10).describe("Cultural interest 0-10"),
    originality_score: z.number().min(0).max(10).describe("Originality/uniqueness 0-10"),
    editorial_highlight: z.string().describe("Max 40 words. One factual sentence about why this event is noteworthy. Spanish rioplatense. Never promotional."),
  })),
});

// ============================================
// System prompt
// ============================================

function buildCuratorPrompt(city: string): string {
  return `You are a cultural curator for ${city}, Argentina.

You receive a JSON array of cultural events. For each event, evaluate its cultural value.

DO NOT modify factual data. Only evaluate and annotate.

Scoring guidelines:
0-2 → low cultural relevance (purely commercial, generic chain cinema, imported blockbuster)
3-4 → standard commercial programming (mainstream cinema, large commercial venue)
5-6 → good standard programming (quality theater, notable artists, established venues)
7-8 → culturally notable (independent productions, community events, unique experiences, local artists)
9-10 → exceptional (landmark event, internationally recognized artist, rare opportunity, free public events of high quality)

Distribute scores across the full range — avoid clustering everything in 4-6.
Events with free admission, community focus, or independent production deserve higher scores.

cultural_category MUST be exactly one of: CINE, TEATRO, MUSICA, DANZA, EXPOSICION, TALLER, FERIA, FESTIVAL, INFANTIL, OTRO

Mapping guide:
- CINE: films, screenings, documentaries, cinema
- TEATRO: theater, plays, stand-up, comedy, monologues
- MUSICA: concerts, recitals, live music, DJ sets, electronic
- DANZA: dance, ballet, contemporary, tango
- EXPOSICION: exhibitions, galleries, visual art, photography
- TALLER: workshops, courses, classes, talks, book presentations
- FERIA: fairs, markets, bazaars
- FESTIVAL: festivals, multi-day events, carnivals
- INFANTIL: children's events, family activities
- OTRO: anything that doesn't fit above

The editorial_highlight must be:
- Written in Spanish rioplatense (Argentina)
- Factual, max 40 words
- One sentence about why this event stands out
- Never promotional or hyperbolic

Return STRICT JSON only. No markdown, no explanations.`;
}

// ============================================
// Main function
// ============================================

/**
 * Curate filtered events: assign cultural scoring, categories, and highlights.
 * Processes in batches if there are more than CURATOR_BATCH_SIZE events.
 */
export async function curateEvents(
  events: FilteredEvent[],
  city: string,
): Promise<CuratedEvent[]> {
  if (events.length === 0) return [];

  const results: CuratedEvent[] = [];

  for (let i = 0; i < events.length; i += CURATOR_BATCH_SIZE) {
    const batch = events.slice(i, i + CURATOR_BATCH_SIZE);

    try {
      const curated = await curateBatch(batch, city);
      results.push(...curated);
    } catch (error) {
      console.warn(
        `[curator] Batch ${Math.floor(i / CURATOR_BATCH_SIZE)} failed, using fallback scores:`,
        error instanceof Error ? error.message : error,
      );
      results.push(...batch.map(buildFallbackCuration));
    }
  }

  console.log(`[curator] Curated ${results.length}/${events.length} events`);
  return results;
}

// ============================================
// Batch curation
// ============================================

async function curateBatch(
  events: FilteredEvent[],
  city: string,
): Promise<CuratedEvent[]> {
  const eventList = events
    .map((e, i) => `[${i}] "${e.title}" — ${e.venue} — ${e.categoryGuess} — ${e.date}\n${e.description}`)
    .join("\n\n");

  const model = getDeepSeekModel();
  const result = await generateObject({
    model,
    schema: curatorSchema,
    system: buildCuratorPrompt(city),
    prompt: `Curate these ${events.length} events:\n\n${eventList}`,
    temperature: CURATOR_TEMPERATURE,
  });

  const curated: CuratedEvent[] = [];

  for (const score of result.object.events) {
    const event = events[score.event_index];
    if (!event) continue;

    curated.push({
      ...event,
      culturalCategory: score.cultural_category,
      culturalScore: score.cultural_score,
      originalityScore: score.originality_score,
      editorialHighlight: score.editorial_highlight.slice(0, 240),
      finalScore: computeFinalScore(score.cultural_score, score.originality_score),
    });
  }

  // Fill in any events missed by the LLM
  for (let i = 0; i < events.length; i++) {
    const event = events[i]!;
    if (!curated.some((c) => c.title === event.title && c.date === event.date && c.venue === event.venue)) {
      curated.push(buildFallbackCuration(event));
    }
  }

  return curated;
}

// ============================================
// Helpers
// ============================================

function computeFinalScore(culturalScore: number, originalityScore: number): number {
  return Math.round(
    (0.5 * culturalScore
      + 0.3 * originalityScore
      + 0.2 * DEFAULT_SOURCE_RELIABILITY)
    * 100,
  ) / 100;
}

function buildFallbackCuration(event: FilteredEvent): CuratedEvent {
  return {
    ...event,
    culturalCategory: "OTRO",
    culturalScore: 5,
    originalityScore: 5,
    editorialHighlight: "",
    finalScore: computeFinalScore(5, 5),
  };
}
