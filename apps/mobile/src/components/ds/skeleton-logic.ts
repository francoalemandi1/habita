export const SKELETON_DELAY_MS = 300;
export const SKELETON_FADE_IN_MS = 180;

/**
 * §6.20 Skeleton: never show it for responses that resolve before the
 * delay — a skeleton that flashes for a few ms reads as a glitch, not loading.
 */
export function shouldDisplaySkeleton(loadingDurationMs: number, delayMs: number = SKELETON_DELAY_MS): boolean {
  return loadingDurationMs >= delayMs;
}
