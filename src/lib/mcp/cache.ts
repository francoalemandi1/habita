/**
 * Upstash Redis cache for MCP tool results.
 *
 * Reuses the same KV_REST_API_URL/KV_REST_API_TOKEN env vars as rate-limit.ts.
 * When unset, every read/write is a no-op (cache disabled, never fails a tool).
 */

import { Redis } from "@upstash/redis";

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = getRedis();

/** Read a cached JSON value. Returns null on miss, disabled cache, or Redis error. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch (error) {
    console.warn(`[mcp/cache] Redis get failed for key "${key}" — treating as miss`, error);
    return null;
  }
}

/** Write a JSON value with a TTL in seconds. No-op when the cache is disabled or Redis errors. */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.warn(`[mcp/cache] Redis set failed for key "${key}" — skipping cache write`, error);
  }
}

/**
 * Set only if the key doesn't exist (a short-lived lock). Returns true when this
 * caller won it. With no Redis there is nothing to coordinate, so it always wins.
 */
export async function cacheSetIfAbsent(key: string, ttlSeconds: number): Promise<boolean> {
  if (!redis) return true;
  try {
    return (await redis.set(key, "1", { nx: true, ex: ttlSeconds })) === "OK";
  } catch (error) {
    console.warn(`[mcp/cache] Redis set-if-absent failed for key "${key}" — skipping`, error);
    return false;
  }
}

// ============================================
// Cache key builders
// ============================================

/** Normalize free text for use as a stable cache key segment. */
function normalizeKeySegment(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function searchCacheKey(term: string, city: string | null | undefined): string {
  const cityPart = city ? normalizeKeySegment(city) : "all";
  return `mcp:search:v1:${normalizeKeySegment(term)}:${cityPart}`;
}

export function compareCacheKey(
  items: Array<{ term: string; quantity: number }>,
  city: string | null | undefined,
): string {
  const sortedItems = [...items]
    .map((item) => `${normalizeKeySegment(item.term)}x${item.quantity}`)
    .sort()
    .join(",");
  const cityPart = city ? normalizeKeySegment(city) : "all";
  return `mcp:compare:v2:${sortedItems}:${cityPart}`;
}

export const PROMOS_CACHE_KEY = "mcp:promos:v2";
export const PROMOS_REFRESH_LOCK_KEY = "mcp:promos:refresh-lock";

// ============================================
// TTLs (seconds)
// ============================================

export const SEARCH_CACHE_TTL_SECONDS = 4 * 60 * 60;
export const COMPARE_CACHE_TTL_SECONDS = 60 * 60;
/**
 * The promo catalog is kept far past its refresh age so a cold call never finds it
 * empty: stale promos are still filtered by validUntil and weekday on read.
 */
export const PROMOS_CACHE_TTL_SECONDS = 14 * 24 * 60 * 60;
export const PROMOS_STALE_AFTER_SECONDS = 6 * 60 * 60;
/** Longer than a full promoarg fetch (~12 s), short enough to retry soon if a refresh dies. */
export const PROMOS_REFRESH_LOCK_TTL_SECONDS = 2 * 60;
