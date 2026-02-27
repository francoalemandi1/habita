/**
 * Mark past events as PAST and clean up expired suggestion cache entries.
 * Called daily from the main cron job.
 */

import { prisma } from "@/lib/prisma";

interface ExpireResult {
  expiredEvents: number;
  deletedSuggestions: number;
}

/**
 * Expire events that have already passed and clean up old cached suggestions.
 *
 * Events are marked PAST when:
 * - endDate exists and is before now, OR
 * - endDate is null but startDate is before yesterday (1-day grace period)
 *
 * Cached RelaxSuggestions older than 7 days past expiry are deleted.
 */
export async function expirePastEvents(): Promise<ExpireResult> {
  const now = new Date();

  // Mark past events
  const expireResult = await prisma.$executeRaw`
    UPDATE "cultural_events"
    SET "status" = 'PAST', "updatedAt" = NOW()
    WHERE "status" = 'ACTIVE'
    AND (
      ("endDate" IS NOT NULL AND "endDate" < ${now})
      OR ("endDate" IS NULL AND "startDate" IS NOT NULL AND "startDate" < ${now} - INTERVAL '1 day')
    )
  `;

  // Clean up old cached suggestions (expired > 7 days ago)
  const deleteResult = await prisma.$executeRaw`
    DELETE FROM "cultural_suggestions"
    WHERE "expiresAt" < ${now} - INTERVAL '7 days'
  `;

  return {
    expiredEvents: expireResult,
    deletedSuggestions: deleteResult,
  };
}
