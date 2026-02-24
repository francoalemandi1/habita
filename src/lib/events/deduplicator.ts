/**
 * Score-based event deduplication.
 * When a new event is about to be inserted, checks for existing duplicates
 * and either merges or flags as new.
 */

import { prisma } from "@/lib/prisma";
import {
  DUPLICATE_SCORE_THRESHOLD,
  DUPLICATE_CANDIDATE_LIMIT,
  DUPLICATE_DATE_WINDOW_MS,
} from "./constants";

import type { RawEventData, DuplicateResult } from "./types";
import type { CulturalEvent } from "@prisma/client";

// ============================================
// Main deduplication function
// ============================================

/**
 * Check if an incoming event is a duplicate of an existing one.
 * Returns the match result with score.
 */
export async function findDuplicate(
  event: RawEventData,
  cityId: string | null
): Promise<DuplicateResult> {
  const candidates = await findCandidates(event, cityId);
  if (candidates.length === 0) {
    return { isDuplicate: false, score: 0 };
  }

  let bestScore = 0;
  let bestEventId: string | undefined;

  for (const candidate of candidates) {
    const score = computeSimilarityScore(event, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestEventId = candidate.id;
    }
  }

  return {
    isDuplicate: bestScore >= DUPLICATE_SCORE_THRESHOLD,
    existingEventId: bestEventId,
    score: bestScore,
  };
}

/**
 * Merge incoming event data into an existing event.
 * Keeps higher-reliability source data, unions arrays, prefers non-null fields.
 */
export async function mergeEvents(
  existingId: string,
  incoming: RawEventData,
  incomingSourceId: string
): Promise<void> {
  const existing = await prisma.culturalEvent.findUnique({
    where: { id: existingId },
    include: { source: { select: { reliabilityScore: true } } },
  });
  if (!existing) return;

  const incomingSource = await prisma.eventSource.findUnique({
    where: { id: incomingSourceId },
    select: { reliabilityScore: true },
  });

  const incomingReliability = incomingSource?.reliabilityScore ?? 50;
  const existingReliability = existing.source?.reliabilityScore ?? 50;
  const preferIncoming = incomingReliability > existingReliability;

  // Merge tags and artists (union, deduplicated)
  const mergedTags = [...new Set([...existing.tags, ...(incoming.tags ?? [])])];
  const mergedArtists = [...new Set([...existing.artists, ...(incoming.artists ?? [])])];

  await prisma.culturalEvent.update({
    where: { id: existingId },
    data: {
      // Prefer non-null fields, with reliability tie-breaking
      description: preferIncoming
        ? (incoming.description ?? existing.description)
        : (existing.description ?? incoming.description),
      venueName: preferIncoming
        ? (incoming.venueName ?? existing.venueName)
        : (existing.venueName ?? incoming.venueName),
      address: preferIncoming
        ? (incoming.address ?? existing.address)
        : (existing.address ?? incoming.address),
      imageUrl: preferIncoming
        ? (incoming.imageUrl ?? existing.imageUrl)
        : (existing.imageUrl ?? incoming.imageUrl),
      latitude: incoming.latitude ?? existing.latitude,
      longitude: incoming.longitude ?? existing.longitude,
      priceMin: incoming.priceMin ?? existing.priceMin,
      priceMax: incoming.priceMax ?? existing.priceMax,
      tags: mergedTags,
      artists: mergedArtists,
      // Update source if incoming is more reliable
      sourceId: preferIncoming ? incomingSourceId : existing.sourceId,
      sourceUrl: preferIncoming
        ? (incoming.sourceUrl ?? existing.sourceUrl)
        : (existing.sourceUrl ?? incoming.sourceUrl),
    },
  });
}

// ============================================
// Candidate selection
// ============================================

/**
 * Find candidate events that might be duplicates.
 * Uses date proximity + city to narrow the search.
 */
async function findCandidates(
  event: RawEventData,
  cityId: string | null
): Promise<CulturalEvent[]> {
  const startDate = parseDate(event.startDate);

  // Build the where clause dynamically
  const where: Record<string, unknown> = {
    status: "ACTIVE",
  };

  if (cityId) {
    where.cityId = cityId;
  }

  if (startDate) {
    where.startDate = {
      gte: new Date(startDate.getTime() - DUPLICATE_DATE_WINDOW_MS),
      lte: new Date(startDate.getTime() + DUPLICATE_DATE_WINDOW_MS),
    };
  }

  return prisma.culturalEvent.findMany({
    where,
    take: DUPLICATE_CANDIDATE_LIMIT,
    orderBy: { startDate: "asc" },
  });
}

// ============================================
// Similarity scoring
// ============================================

/**
 * Compute similarity score (0-100) between an incoming event and existing one.
 * - Title similarity: max 40 points
 * - Same venue: 20 points
 * - Date within 1 day: 20 points
 * - Artist overlap: 20 points
 */
function computeSimilarityScore(
  incoming: RawEventData,
  existing: CulturalEvent
): number {
  let score = 0;

  // Title similarity (max 40)
  const titleSim = normalizedSimilarity(incoming.title, existing.title);
  score += Math.round(titleSim * 40);

  // Venue similarity (20)
  if (incoming.venueName && existing.venueName) {
    const venueSim = normalizedSimilarity(incoming.venueName, existing.venueName);
    if (venueSim > 0.7) score += 20;
  }

  // Date proximity (20)
  const incomingDate = parseDate(incoming.startDate);
  if (incomingDate && existing.startDate) {
    const diffMs = Math.abs(incomingDate.getTime() - existing.startDate.getTime());
    if (diffMs <= DUPLICATE_DATE_WINDOW_MS) score += 20;
  }

  // Artist overlap (20)
  if (incoming.artists?.length && existing.artists.length > 0) {
    const incomingArtists = new Set(incoming.artists.map(normalizeForComparison));
    const existingArtists = existing.artists.map(normalizeForComparison);
    const hasOverlap = existingArtists.some((a) => incomingArtists.has(a));
    if (hasOverlap) score += 20;
  }

  return Math.min(score, 100);
}

// ============================================
// Text utilities
// ============================================

function normalizeForComparison(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Compute normalized similarity (0-1) between two strings.
 * Uses Levenshtein distance normalized by max length.
 */
function normalizedSimilarity(a: string, b: string): number {
  const normA = normalizeForComparison(a);
  const normB = normalizeForComparison(b);
  if (normA === normB) return 1;

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1;

  const distance = levenshtein(normA, normB);
  return 1 - distance / maxLen;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost
      );
    }
  }

  return matrix[b.length]![a.length]!;
}

function parseDate(date?: Date | string): Date | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return isNaN(d.getTime()) ? null : d;
}
