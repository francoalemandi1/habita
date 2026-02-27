/**
 * Merge DB events into LLM-generated results with title-similarity dedup.
 * DB events that match an LLM event (by title) replace it.
 * Non-matching DB events are prepended to the list.
 */

import type { RelaxEvent } from "@/lib/events/types";

const MAX_DB_EVENTS_ADDED = 5;
const WORD_OVERLAP_THRESHOLD = 0.6;

/**
 * Merge verified DB events into LLM-generated results.
 *
 * For each DB event:
 * - If a similar LLM event exists (>= 60% word overlap), replace it with the DB version
 * - If no match, prepend to the list (up to MAX_DB_EVENTS_ADDED new entries)
 */
export function mergeDbEventsIntoResults(
  llmEvents: RelaxEvent[],
  dbEvents: RelaxEvent[]
): RelaxEvent[] {
  if (dbEvents.length === 0) return llmEvents;

  const result = [...llmEvents];
  const prependQueue: RelaxEvent[] = [];

  for (const dbEvent of dbEvents) {
    const matchIndex = findSimilarEventIndex(result, dbEvent);

    if (matchIndex >= 0) {
      // Replace the LLM event with the richer DB version
      result[matchIndex] = dbEvent;
    } else if (prependQueue.length < MAX_DB_EVENTS_ADDED) {
      prependQueue.push(dbEvent);
    }
  }

  return [...prependQueue, ...result];
}

/**
 * Find the index of a similar event in the list based on title word overlap.
 * Returns -1 if no match found.
 */
function findSimilarEventIndex(events: RelaxEvent[], target: RelaxEvent): number {
  const targetWords = extractWords(target.title);
  if (targetWords.size === 0) return -1;

  for (let i = 0; i < events.length; i++) {
    const candidateWords = extractWords(events[i]!.title);
    if (candidateWords.size === 0) continue;

    const overlap = computeWordOverlap(targetWords, candidateWords);
    if (overlap >= WORD_OVERLAP_THRESHOLD) return i;
  }

  return -1;
}

/** Extract normalized words from a title for comparison. */
function extractWords(text: string): Set<string> {
  return new Set(
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2) // Skip short words (de, en, la, etc.)
  );
}

/** Compute word overlap ratio (Jaccard-like, relative to the smaller set). */
function computeWordOverlap(a: Set<string>, b: Set<string>): number {
  const smaller = a.size <= b.size ? a : b;
  const larger = a.size <= b.size ? b : a;

  let matches = 0;
  for (const word of smaller) {
    if (larger.has(word)) matches++;
  }

  return smaller.size > 0 ? matches / smaller.size : 0;
}
