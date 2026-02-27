/**
 * Stage 6: Source yield control — reject sources with low-quality output.
 *
 * A source is rejected if:
 * - It produces fewer than MIN_VALID_EVENTS valid events
 * - More than MAX_INVALID_RATE of its non-expired events are invalid
 *
 * "Expired" events (structurally sound but past date) are NOT counted as
 * invalid — agendas normally list the whole month including past events.
 * Only structurally broken events (bad title, missing venue, etc.) count.
 */

import type { ExtractedEvent, ValidatedEvent, SourceYieldReport } from "./types";

// ============================================
// Constants
// ============================================

const MIN_VALID_EVENTS = 1;
const MAX_INVALID_RATE = 0.8;

// ============================================
// Main function
// ============================================

interface SourceResult {
  domain: string;
  valid: ValidatedEvent[];
  /** Structurally broken events — count against the source. */
  invalid: ExtractedEvent[];
  /** Past-date events — do NOT count against the source. */
  expired: ExtractedEvent[];
}

/**
 * Enforce source yield thresholds.
 * Returns only events from accepted sources, plus reports for logging.
 */
export function enforceSourceYield(
  results: SourceResult[]
): { acceptedEvents: ValidatedEvent[]; reports: SourceYieldReport[] } {
  const acceptedEvents: ValidatedEvent[] = [];
  const reports: SourceYieldReport[] = [];

  for (const { domain, valid, invalid, expired } of results) {
    // Only valid + invalid count for quality assessment (expired are neutral)
    const qualityTotal = valid.length + invalid.length;
    const invalidRate = qualityTotal > 0
      ? invalid.length / qualityTotal
      : 0;

    const accepted = valid.length >= MIN_VALID_EVENTS && invalidRate <= MAX_INVALID_RATE;

    reports.push({
      domain,
      totalExtracted: valid.length + invalid.length + expired.length,
      validCount: valid.length,
      invalidCount: invalid.length,
      invalidRate: Math.round(invalidRate * 100) / 100,
      accepted,
    });

    if (accepted) {
      acceptedEvents.push(...valid);
    }
  }

  return { acceptedEvents, reports };
}
