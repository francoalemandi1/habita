/**
 * Shared types for the cultural events ingestion and search system.
 */

import type { EventCategory, EventStatus } from "@prisma/client";

// ============================================
// Provider types
// ============================================

/** Raw event from any provider, before normalization and dedup. */
export interface RawEventData {
  title: string;
  description?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  venueName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  cityName?: string;
  province?: string;
  category?: EventCategory;
  tags?: string[];
  artists?: string[];
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  sourceUrl?: string;
  sourceEventId?: string;
  imageUrl?: string;
  status?: EventStatus;
}

/** Result of a single provider's fetch operation. */
export interface ProviderFetchResult {
  events: RawEventData[];
  hasMore: boolean;
  cursor?: string;
  errors: string[];
}

// ============================================
// Orchestrator types
// ============================================

/** Outcome of processing one provider (returned by the orchestrator). */
export interface IngestionOutcome {
  sourceId: string;
  sourceName: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  eventsFound: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDuplicate: number;
  durationMs: number;
  errorMessage?: string;
}

// ============================================
// Search types
// ============================================

export interface EventSearchOptions {
  query?: string;
  cityId?: string;
  category?: EventCategory;
  dateFrom?: Date;
  dateTo?: Date;
  limit: number;
  offset: number;
}

export interface EventSearchResult {
  events: SearchEventRow[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/** Row returned from search queries (flat, no relations). */
export interface SearchEventRow {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  startDate: Date | null;
  endDate: Date | null;
  venueName: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  cityId: string | null;
  province: string | null;
  category: EventCategory;
  tags: string[];
  artists: string[];
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  status: EventStatus;
  createdAt: Date;
  // Joined fields
  cityName?: string | null;
  cityProvince?: string | null;
}

// ============================================
// Deduplication types
// ============================================

export interface DuplicateResult {
  isDuplicate: boolean;
  existingEventId?: string;
  score: number;
}
