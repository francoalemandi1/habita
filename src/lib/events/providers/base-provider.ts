/**
 * Base interface for all event providers.
 * Each provider fetches events from one source and returns raw data.
 * The orchestrator handles normalization, dedup, and persistence.
 */

import type { ProviderFetchResult } from "../types";

export interface EventProvider {
  /** Unique source name — must match EventSource.name in DB. */
  readonly sourceName: string;

  /**
   * Fetch events from the source.
   * Must complete within the Vercel cron timeout (~50s budget).
   * Implementations should handle pagination internally if needed.
   */
  fetchEvents(options: FetchOptions): Promise<ProviderFetchResult>;
}

export interface FetchOptions {
  /** Abort signal for timeout enforcement. */
  signal: AbortSignal;
  /** Maximum number of events to fetch in this run. */
  maxEvents: number;
  /** Optional cursor from a previous partial run. */
  cursor?: string;
}
