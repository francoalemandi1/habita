/** §6.20 — skip the skeleton entirely if data arrives before this threshold. */
export const SKELETON_MIN_DELAY_MS = 300;

export function shouldShowSkeleton(elapsedMs: number): boolean {
  return elapsedMs >= SKELETON_MIN_DELAY_MS;
}
