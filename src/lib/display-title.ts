const LOWERCASE_LETTER = /\p{Ll}/u;
const WORD = /[\p{L}\p{N}]+/gu;

const SENTENCE_START = /(^|[.!?¡¿:]\s*)$/u;

function isCapitalized(word: string): boolean {
  const first = word.charAt(0);
  return first !== first.toLocaleLowerCase("es-AR");
}

/**
 * Words written with an initial capital mid-sentence in the description, e.g. "Roger" in
 * "Concierto de Elena Roger.". Sentence-opening words are skipped: their capital is grammar, not a name.
 */
function collectProperNouns(description: string | null | undefined): Map<string, string> {
  const properNouns = new Map<string, string>();
  for (const match of description?.matchAll(WORD) ?? []) {
    const word = match[0];
    const isSentenceStart = SENTENCE_START.test(description?.slice(0, match.index) ?? "");
    if (isCapitalized(word) && !isSentenceStart) properNouns.set(word.toLocaleLowerCase("es-AR"), word);
  }
  return properNouns;
}

/**
 * Source event titles sometimes arrive in ALL CAPS. Only that case is rewritten, to sentence case,
 * restoring the capitalization of words the description writes with a capital ("Elena Roger").
 * Any title with at least one lowercase letter is left untouched.
 */
export function toDisplayTitle(title: string, description?: string | null): string {
  if (LOWERCASE_LETTER.test(title)) return title;

  const properNouns = collectProperNouns(description);
  const lower = title.toLocaleLowerCase("es-AR").replace(WORD, (word) => properNouns.get(word) ?? word);
  return lower.charAt(0).toLocaleUpperCase("es-AR") + lower.slice(1);
}
