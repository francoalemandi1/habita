/**
 * City name normalization — resolves raw city names (from event sources)
 * to canonical CulturalCity IDs using exact + fuzzy matching.
 */

import { prisma } from "@/lib/prisma";

// ============================================
// Module-scoped cache (lives for function invocation lifetime)
// ============================================

interface CityEntry {
  cityId: string;
  normalized: string;
}

let cityIndex: {
  exactMap: Map<string, string>;
  entries: CityEntry[];
} | null = null;

/**
 * Resolve a raw city name to a canonical CulturalCity ID.
 * Returns null if no match is found.
 */
export async function resolveCityId(rawCityName: string): Promise<string | null> {
  if (!rawCityName.trim()) return null;

  const index = await loadCityIndex();
  const normalized = normalizeText(rawCityName);

  // 1. Exact match (canonical name or any alias)
  const exactMatch = index.exactMap.get(normalized);
  if (exactMatch) return exactMatch;

  // 2. Fuzzy match (Levenshtein distance)
  const maxDistance = normalized.length <= 6 ? 2 : 3;
  let bestMatch: { cityId: string; distance: number } | null = null;

  for (const entry of index.entries) {
    const distance = levenshtein(normalized, entry.normalized);
    if (distance <= maxDistance) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { cityId: entry.cityId, distance };
      }
    }
  }

  return bestMatch?.cityId ?? null;
}

/**
 * Load the city index from DB on first call, then cache in module scope.
 */
async function loadCityIndex(): Promise<NonNullable<typeof cityIndex>> {
  if (cityIndex) return cityIndex;

  const cities = await prisma.culturalCity.findMany({
    select: { id: true, name: true, aliases: true },
  });

  const exactMap = new Map<string, string>();
  const entries: CityEntry[] = [];

  for (const city of cities) {
    const normalizedName = normalizeText(city.name);
    exactMap.set(normalizedName, city.id);
    entries.push({ cityId: city.id, normalized: normalizedName });

    for (const alias of city.aliases) {
      const normalizedAlias = normalizeText(alias);
      exactMap.set(normalizedAlias, city.id);
    }
  }

  cityIndex = { exactMap, entries };
  return cityIndex;
}

/**
 * Normalize text for comparison: lowercase, strip accents, trim.
 */
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Compute Levenshtein distance between two strings.
 * Simple O(m*n) implementation — fine for our candidate set size (~15 cities).
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost
      );
    }
  }

  return matrix[b.length]![a.length]!;
}

/** Reset the cache (useful for testing). */
export function resetCityIndex(): void {
  cityIndex = null;
}
