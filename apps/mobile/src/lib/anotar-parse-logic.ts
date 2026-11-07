/** §5.3 Global "Anotar" — pure debounce/staleness rules for live parsing. */

export const PARSE_DEBOUNCE_MS = 700;
export const PARSE_MIN_CHARS = 3;
export const PARSE_TIMEOUT_MS = 8000;

/** Whether a new parse request should fire for the current text. */
export function shouldParse(text: string, lastParsedText: string | null): boolean {
  const trimmed = text.trim();
  if (trimmed.length < PARSE_MIN_CHARS) return false;
  return trimmed !== lastParsedText;
}

/** True when a response belongs to text the user has since changed (ignore it, latest wins). */
export function isStaleParseResponse(requestedText: string, latestText: string): boolean {
  return requestedText.trim() !== latestText.trim();
}
