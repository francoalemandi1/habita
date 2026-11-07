export interface SorteoCandidate {
  id: string;
}

/** Picks a random candidate; `random` is injectable so tests can pin the outcome. */
export function pickSorteoWinner<T extends SorteoCandidate>(
  candidates: readonly T[],
  random: () => number = Math.random,
): T | null {
  if (candidates.length === 0) return null;
  const index = Math.floor(random() * candidates.length);
  return candidates[Math.min(index, candidates.length - 1)] ?? null;
}
