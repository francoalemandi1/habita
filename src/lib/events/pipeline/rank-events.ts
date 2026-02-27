/**
 * Stage 10: Ranking + diversity enforcement.
 *
 * Rules (from master prompt):
 * - Sort by finalScore descending
 * - Max 2 events per venue
 * - No 3 consecutive events with the same cultural category
 * - At least 1 "independent" event in top 5
 */

import type { ScoredEvent } from "./types";

// ============================================
// Types
// ============================================

export interface RankableEvent {
  eventId: string;
  scoring: ScoredEvent;
  finalScore: number;
  venueName: string;
}

// ============================================
// Main function
// ============================================

/**
 * Rank and diversify scored events.
 * Returns ordered event IDs after applying diversity constraints.
 * Does NOT reduce total count — only reorders.
 */
export function rankAndDiversify(events: RankableEvent[]): string[] {
  if (events.length === 0) return [];

  // Step 1: Sort by finalScore descending
  const sorted = [...events].sort((a, b) => b.finalScore - a.finalScore);

  // Step 2: Greedy selection with diversity constraints
  const result: RankableEvent[] = [];
  const venueCounts = new Map<string, number>();
  const remaining = [...sorted];

  while (remaining.length > 0) {
    let picked = false;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i]!;
      const venueKey = normalizeVenueName(candidate.venueName);
      const venueCount = venueCounts.get(venueKey) ?? 0;

      // Max 2 events per venue
      if (venueCount >= 2) continue;

      // No 3 consecutive same category
      if (result.length >= 2) {
        const last1 = result[result.length - 1]!;
        const last2 = result[result.length - 2]!;
        if (
          last1.scoring.culturalCategory === candidate.scoring.culturalCategory &&
          last2.scoring.culturalCategory === candidate.scoring.culturalCategory
        ) {
          // Try to find a different-category event first
          // Only skip if there are other candidates to try
          if (remaining.length > 1) continue;
        }
      }

      // Accept this candidate
      result.push(candidate);
      venueCounts.set(venueKey, venueCount + 1);
      remaining.splice(i, 1);
      picked = true;
      break;
    }

    // If no candidate passed all constraints, take the first remaining (relax constraints)
    if (!picked && remaining.length > 0) {
      const fallback = remaining.shift()!;
      result.push(fallback);
      const venueKey = normalizeVenueName(fallback.venueName);
      venueCounts.set(venueKey, (venueCounts.get(venueKey) ?? 0) + 1);
    }
  }

  // Step 3: Ensure at least 1 independent event in top 5
  ensureIndependentInTopFive(result);

  return result.map((e) => e.eventId);
}

// ============================================
// Helpers
// ============================================

function normalizeVenueName(venue: string): string {
  return venue
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * If no independent event exists in top 5, swap the first independent
 * event found after position 5 with the last event in top 5.
 */
function ensureIndependentInTopFive(events: RankableEvent[]): void {
  if (events.length <= 5) return;

  const hasIndependentInTopFive = events
    .slice(0, 5)
    .some((e) => e.scoring.commercialVsIndependent === "independent");

  if (hasIndependentInTopFive) return;

  // Find first independent after position 5
  for (let i = 5; i < events.length; i++) {
    if (events[i]!.scoring.commercialVsIndependent === "independent") {
      // Swap with position 4 (last in top 5)
      const temp = events[4]!;
      events[4] = events[i]!;
      events[i] = temp;
      break;
    }
  }
}
