/**
 * Classifies a failed /api/ai/parse-entry call into the outcomes the Anotar
 * sheet reacts to (handoff §5.3): ai_disabled / network error / timeout fall
 * back to the classic form; a 429 keeps the current preview with a hint.
 */
export type AnotarAiOutcome = "ai-disabled" | "rate-limited" | "network-error" | "timeout";

export interface ClassifyParseErrorInput {
  status?: number;
  isAbort?: boolean;
}

export function classifyParseError({ status, isAbort }: ClassifyParseErrorInput): AnotarAiOutcome {
  if (isAbort) return "timeout";
  if (status === 429) return "rate-limited";
  if (status === 503) return "ai-disabled";
  return "network-error";
}

/** 429 keeps the preview and only hints at the delay; every other outcome opens the classic form. */
export function shouldFallbackToClassic(outcome: AnotarAiOutcome): boolean {
  return outcome !== "rate-limited";
}
