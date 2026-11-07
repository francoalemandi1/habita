/**
 * Argentine grocery Spanish synonym/stemming helpers.
 *
 * All inputs/outputs here are expected to already be normalized (lowercase,
 * accents stripped) except `expandTermVariants`, which accepts a raw term.
 */

export type SynonymGroup = readonly string[];

/**
 * Curated groups of equivalent grocery terms for Argentina. Only true
 * equivalents (regional names, generic vs. brand-as-generic) — never
 * different-but-related items (e.g. cuts of meat are NOT interchangeable).
 */
const SYNONYM_GROUPS: readonly SynonymGroup[] = [
  ["lavandina", "cloro"],
  ["porotos", "frijoles"],
  ["zapallito", "zucchini"],
  ["palta", "aguacate"],
  ["frutilla", "fresa"],
  ["durazno", "melocoton"],
  ["anana", "pina"],
  ["dulce de leche", "ddl"],
  ["yerba", "yerba mate"],
  ["papa", "patata"],
  ["arveja", "guisante"],
  ["morron", "pimiento"],
  ["banana", "platano"],
  ["coca", "coca cola", "gaseosa cola"],
  ["sprite", "gaseosa lima limon"],
  ["maicena", "almidon de maiz"],
  ["gillette", "afeitadora"],
  ["curitas", "apositos"],
  ["birome", "lapicera"],
  ["pochoclo", "palomitas"],
  ["mani", "cacahuete"],
  ["chaucha", "vainita"],
  ["jugo", "zumo"],
  ["manteca", "mantequilla"],
  ["panuelos descartables", "panuelos de papel"],
  ["bolsas de residuo", "bolsas de basura"],
];

const SYNONYM_LOOKUP = new Map<string, SynonymGroup>();
for (const group of SYNONYM_GROUPS) {
  for (const member of group) {
    SYNONYM_LOOKUP.set(member, group);
  }
}

/** Consonants that commonly take the Spanish "+es" plural ending (e.g. limón -> limones). */
const ES_PLURAL_CONSONANTS = new Set(["l", "n", "r", "d", "z", "j", "s", "y"]);

/**
 * Conservative Spanish plural stripping. Never touches tokens of 3 chars or
 * less. Prefers "-s after vowel" (tomates -> tomate) unless the "-es" split
 * leaves a root ending in a consonant that regularly takes "+es"
 * (limones -> limon), which takes priority.
 */
export function stemToken(token: string): string {
  if (token.length <= 3 || !token.endsWith("s")) return token;

  if (token.endsWith("es") && token.length > 4) {
    const esStem = token.slice(0, -2);
    const lastChar = esStem[esStem.length - 1];
    if (lastChar !== undefined && ES_PLURAL_CONSONANTS.has(lastChar) && esStem.length >= 3) {
      return esStem;
    }
  }

  const sStem = token.slice(0, -1);
  return sStem.length >= 3 ? sStem : token;
}

function findSynonymGroup(token: string): SynonymGroup | null {
  const direct = SYNONYM_LOOKUP.get(token);
  if (direct) return direct;

  const stemmed = stemToken(token);
  if (stemmed !== token) {
    const viaStem = SYNONYM_LOOKUP.get(stemmed);
    if (viaStem) return viaStem;
  }

  return null;
}

/** Other normalized terms/phrases equivalent to `token`, excluding itself. */
function getSynonyms(token: string): string[] {
  const group = findSynonymGroup(token);
  if (!group) return [];
  return group.filter((member) => member !== token);
}

/** True if `phrase` appears in `normalizedName` as whole words (never inside a longer word). */
function containsWholePhrase(normalizedName: string, phrase: string): boolean {
  return ` ${normalizedName} `.includes(` ${phrase} `);
}

/**
 * True if `normalizedName` contains `token` (substring, as before), or —
 * compared word by word so "limones" never matches "limonada" and "pina"
 * never matches "espinaca" — a word with the same stem, or a synonym.
 */
export function tokenMatches(token: string, normalizedName: string): boolean {
  if (normalizedName.includes(token)) return true;

  const nameWordStems = normalizedName.split(/\s+/).map(stemToken);
  if (nameWordStems.includes(stemToken(token))) return true;

  return getSynonyms(token).some((synonym) =>
    synonym.includes(" ")
      ? containsWholePhrase(normalizedName, synonym)
      : nameWordStems.includes(stemToken(synonym)),
  );
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * The normalized term plus up to 2 synonym-substituted variants (3 total),
 * deduped. Used to retry a store search with a different query string when
 * the user's term and the store's catalog use different vocabulary.
 */
export function expandTermVariants(term: string): string[] {
  const normalizedTerm = normalize(term);
  const variants = new Set<string>([normalizedTerm]);
  const MAX_VARIANTS = 3;

  const fullPhraseGroup = findSynonymGroup(normalizedTerm);
  if (fullPhraseGroup) {
    for (const member of fullPhraseGroup) {
      if (variants.size >= MAX_VARIANTS) break;
      variants.add(member);
    }
  }

  const tokens = normalizedTerm.split(/\s+/);
  for (let i = 0; i < tokens.length && variants.size < MAX_VARIANTS; i++) {
    const token = tokens[i];
    if (token === undefined) continue;
    for (const synonym of getSynonyms(token)) {
      if (variants.size >= MAX_VARIANTS) break;
      const variantTokens = [...tokens];
      variantTokens[i] = synonym;
      variants.add(variantTokens.join(" "));
    }
  }

  return Array.from(variants);
}
