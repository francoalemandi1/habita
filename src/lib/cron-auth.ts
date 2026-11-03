import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

type CronAuthResult =
  | { isAuthorized: true; cronSecret: string }
  | { isAuthorized: false; response: NextResponse };

/**
 * Validates the `Authorization: Bearer <CRON_SECRET>` header.
 * Vercel Cron sends this header automatically when CRON_SECRET is set.
 */
export function authorizeCronRequest(request: NextRequest): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return {
      isAuthorized: false,
      response: NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 }),
    };
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return {
      isAuthorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { isAuthorized: true, cronSecret };
}
