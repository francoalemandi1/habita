import { ApiError } from "@habita/api-client";

/**
 * Pure, React-Native-free module: `offline-detector.ts` imports `react-native`
 * (AppState) at the top level, which Vitest's SSR transform can't parse
 * outside the Expo/Metro pipeline. Keeping these two testable helpers here
 * lets `__tests__/offline-detector.test.ts` run under the root `pnpm test`.
 */

/**
 * True for a genuine connectivity failure (fetch couldn't reach the server),
 * never for an HTTP 4xx/5xx — those reach the server and are handled as errors, not offline.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) return error.code === "NETWORK_ERROR";
  if (error instanceof TypeError) {
    return /network request failed|failed to fetch/i.test(error.message);
  }
  return false;
}

const PROBE_DELAYS_MS = [5_000, 15_000, 30_000, 60_000] as const;

/** Backoff schedule for the `/api/health` reachability probe: 5s → 15s → 30s → 60s max. */
export function nextProbeDelayMs(attempt: number): number {
  const index = Math.min(Math.max(attempt, 0), PROBE_DELAYS_MS.length - 1);
  return PROBE_DELAYS_MS[index] ?? PROBE_DELAYS_MS[0];
}
