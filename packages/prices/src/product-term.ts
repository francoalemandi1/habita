const COMBINING_DIACRITICS = /[\u0300-\u036f]/g;

/** Normalizes a product name/term for case- and accent-insensitive comparison. */
export function normalizeProductTerm(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(COMBINING_DIACRITICS, "").trim();
}
