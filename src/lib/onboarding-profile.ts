/**
 * Re-exports platform-agnostic parsing from @habita/domain,
 * plus server-only LLM prompt sanitization utilities.
 */

export {
  parseOnboardingProfile,
  buildOnboardingProfilePayload,
  extractStringArray,
  type ParsedOnboardingProfile,
  type TaskReason,
  type OnboardingProfilePayload,
} from "@habita/domain/onboarding-profile";

/**
 * Sanitize a string for safe injection into LLM prompts.
 * Strips patterns that could be used for indirect prompt injection.
 */
export function sanitizeForPrompt(value: string): string {
  return value
    .replace(/[#`{}[\]]/g, "")              // Remove markdown/code markers
    .replace(/\n/g, " ")                     // Flatten newlines
    .replace(/\s{2,}/g, " ")                // Collapse whitespace
    .trim()
    .slice(0, 100);                          // Hard cap length
}

/** Sanitize an array of hints for safe LLM prompt injection. */
export function sanitizeHintsForPrompt(hints: string[]): string[] {
  return hints
    .map(sanitizeForPrompt)
    .filter((h) => h.length > 0);
}
