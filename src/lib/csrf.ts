import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

/**
 * Allowed origins for state-changing requests.
 * Falls back to NEXTAUTH_URL if set, otherwise localhost for dev.
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl) {
    try {
      origins.push(new URL(nextAuthUrl).origin);
    } catch {
      // ignore malformed URL
    }
  }

  // Always allow localhost in development
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000", "http://localhost:3001");
  }

  return origins;
}

/**
 * Verify that a state-changing request comes from an allowed origin.
 * Returns a 403 response if the origin is not allowed, or null if OK.
 *
 * Exemptions:
 * - Requests with Bearer token (mobile API — not vulnerable to CSRF)
 * - Requests without Origin AND without Referer (server-to-server, curl, etc.)
 */
export function verifyCsrfOrigin(request: NextRequest): NextResponse | null {
  // Mobile API uses Bearer tokens — immune to CSRF
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return null;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // No origin or referer — likely server-to-server or non-browser client
  if (!origin && !referer) {
    return null;
  }

  const allowed = getAllowedOrigins();

  // Check Origin header first (most reliable)
  if (origin && allowed.includes(origin)) {
    return null;
  }

  // Fallback to Referer header
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowed.includes(refererOrigin)) {
        return null;
      }
    } catch {
      // malformed referer — block
    }
  }

  return NextResponse.json(
    { error: "Origin no permitido" },
    { status: 403 },
  );
}
