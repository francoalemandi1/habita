import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Reachability probe for the clients' offline detection: no auth, no DB, never cached,
 * so a 200 means "the API is reachable from this device" and nothing more.
 */
export function GET(): NextResponse {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
