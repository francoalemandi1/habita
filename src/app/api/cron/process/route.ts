import { authorizeCronRequest } from "@/lib/cron-auth";
import { runCronProcess } from "@/lib/cron/run-process";

import type { NextRequest } from "next/server";

export const maxDuration = 300;

/**
 * GET and POST /api/cron/process
 * Vercel Cron sends GET; manual/internal triggers send POST. Both run the same job.
 * Protegido por CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const auth = authorizeCronRequest(request);
  if (!auth.isAuthorized) return auth.response;
  return runCronProcess(auth.cronSecret);
}

export const POST = GET;
