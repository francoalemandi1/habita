/**
 * Mark past events as PAST and clean up expired cache entries.
 * Called daily from the main cron job.
 */

import { prisma } from "@/lib/prisma";

interface ExpireResult {
  expiredEvents: number;
  deletedRestaurantCache: number;
}

/**
 * Expire events that have already passed and clean up old cached data.
 *
 * Events are marked PAST when:
 * - endDate exists and is before now, OR
 * - endDate is null but startDate is before yesterday (1-day grace period)
 *
 * Expired RestaurantCacheCity rows older than 7 days past expiry are deleted.
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

  // Clean up old restaurant cache (expired > 7 days ago)
  const deleteRestaurantCache = await prisma.$executeRaw`
    DELETE FROM "restaurant_cache_city"
    WHERE "expiresAt" < ${now} - INTERVAL '7 days'
  `;

  return {
    expiredEvents: expireResult,
    deletedRestaurantCache: deleteRestaurantCache,
  };
}
