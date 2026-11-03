export interface SplitBarSegment {
  id: string;
  value: number;
}

export interface SplitBarComputed {
  id: string;
  value: number;
  percent: number;
}

/**
 * §6.19 — SplitBar segments must sum to exactly 100% even when individual
 * shares round down, so the last non-zero segment absorbs the remainder.
 */
export function computeSplitBarSegments(
  segments: readonly SplitBarSegment[],
  total: number
): SplitBarComputed[] {
  if (total <= 0 || segments.length === 0) {
    return segments.map((segment) => ({ ...segment, percent: 0 }));
  }

  const rounded = segments.map((segment) => ({
    ...segment,
    percent: Math.floor((segment.value / total) * 100),
  }));

  const assigned = rounded.reduce((sum, segment) => sum + segment.percent, 0);
  const remainder = 100 - assigned;

  const lastNonZeroIndex = findLastNonZeroIndex(segments);
  if (remainder > 0 && lastNonZeroIndex >= 0) {
    rounded[lastNonZeroIndex] = {
      ...rounded[lastNonZeroIndex]!,
      percent: rounded[lastNonZeroIndex]!.percent + remainder,
    };
  }

  return rounded;
}

function findLastNonZeroIndex(segments: readonly SplitBarSegment[]): number {
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    if (segments[i]!.value > 0) {
      return i;
    }
  }
  return -1;
}
