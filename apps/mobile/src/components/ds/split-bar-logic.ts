export interface SplitSegment {
  /** Fraction of the bar width, 0-1. */
  fraction: number;
  /** Index into the seniority color order (ink, ink2, #B9B3A6, repeating). */
  colorIndex: number;
}

export interface SplitBarResult {
  segments: SplitSegment[];
  /** Fraction left over ("restante" / "parejo"), always >= 0. */
  remainingFraction: number;
}

/**
 * §6.19 SplitBar math: each member's share as a fraction of `total`, in
 * household-seniority order, plus whatever remains unaccounted for.
 */
export function computeSplitSegments(values: number[], total: number): SplitBarResult {
  if (total <= 0 || values.length === 0) {
    return { segments: [], remainingFraction: 1 };
  }

  const segments = values.map((value, index) => ({
    fraction: Math.max(0, value) / total,
    colorIndex: index % 3,
  }));

  const consumedFraction = segments.reduce((sum, segment) => sum + segment.fraction, 0);
  const remainingFraction = Math.max(0, 1 - consumedFraction);

  return { segments, remainingFraction };
}
