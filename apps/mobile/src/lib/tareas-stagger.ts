/** Pure helper for the "Aplicar plan" staggered entrance (handoff §7: 40ms per row). */

export const APPLY_PLAN_STAGGER_MS = 40;

export function computeStaggerDelay(index: number): number {
  return Math.max(0, index) * APPLY_PLAN_STAGGER_MS;
}
