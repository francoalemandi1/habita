import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = getRedis();

/**
 * Pre-configured rate limiters for different endpoint categories.
 * Uses sliding window algorithm for smooth rate limiting.
 */
const limiters = redis
  ? {
      /** Auth endpoints: 10 requests per 5 minutes per key */
      auth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "5 m") }),
      /** Sensitive actions (join): 5 requests per minute per key */
      sensitive: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 m") }),
    }
  : null;

type LimiterKind = "auth" | "sensitive";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Apply rate limiting to an API route.
 * Returns a 429 response if the limit is exceeded, or null if allowed.
 * Silently allows requests if Redis is not configured (graceful degradation).
 */
export async function applyRateLimit(
  request: NextRequest,
  kind: LimiterKind,
  /** Optional suffix to scope limits (e.g. userId). Defaults to client IP. */
  keySuffix?: string,
): Promise<NextResponse | null> {
  if (!limiters) return null;

  const limiter = limiters[kind];
  const key = `${kind}:${keySuffix ?? getClientIp(request)}`;

  try {
    const { success, remaining, reset } = await limiter.limit(key);
    if (!success) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intentá de nuevo más tarde." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }
    return null;
  } catch {
    // Redis error — allow request (fail-open)
    return null;
  }
}
