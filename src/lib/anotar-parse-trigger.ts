/**
 * Pure debounce/stale-response logic for the Anotar live parse (handoff §6.22).
 * Timing (the 700ms pause) is a side effect that lives in the hook; this module
 * only decides *whether* a parse should fire and *which* response is current.
 */

/** A parse fires when the trimmed text has >=3 chars and differs from the last parsed text. */
export function shouldTriggerParse(text: string, lastParsedText: string | null): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return false;
  return trimmed !== (lastParsedText ?? "").trim();
}

export interface RequestSequencer {
  /** Registers a new in-flight request and returns its id. */
  next: () => number;
  /** Whether `id` is still the most recently started request (i.e. not stale). */
  isLatest: (id: number) => boolean;
}

/** Tracks in-flight request ids so a slow, superseded response can be ignored. */
export function createRequestSequencer(): RequestSequencer {
  let latest = 0;
  return {
    next: () => {
      latest += 1;
      return latest;
    },
    isLatest: (id: number) => id === latest,
  };
}
