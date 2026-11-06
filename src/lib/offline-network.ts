import { ApiError } from "@habita/api-client";

/**
 * True for a connectivity failure. The shared api-client wraps a raw fetch
 * `TypeError` into `ApiError(status: 0, code: "NETWORK_ERROR")` before it
 * reaches callers, so that's the signal to check — never an HTTP error status.
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "NETWORK_ERROR";
}

const PROBE_DELAYS_MS = [5_000, 15_000, 30_000, 60_000] as const;

/** Offline reachability probe backoff: 5s → 15s → 30s → capped at 60s (handoff §7 "Sin conexión"). */
export function nextProbeDelayMs(attempt: number): number {
  const index = Math.min(Math.max(attempt, 0), PROBE_DELAYS_MS.length - 1);
  return PROBE_DELAYS_MS[index] ?? PROBE_DELAYS_MS[0];
}

const MAX_MUTATION_RETRIES = 3;

/** Shared retry policy for queued A/B mutations: only a network failure retries, so a real error surfaces right away. */
export function offlineMutationRetry(failureCount: number, error: unknown): boolean {
  return isNetworkError(error) && failureCount < MAX_MUTATION_RETRIES;
}
