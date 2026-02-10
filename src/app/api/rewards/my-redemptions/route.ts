import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * GET /api/rewards/my-redemptions
 * Get the current member's reward redemptions (paginated)
 */
export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();

    const { searchParams } = request.nextUrl;
    const take = Math.min(
      Number(searchParams.get("limit")) || DEFAULT_LIMIT,
      MAX_LIMIT
    );
    const skip = Math.max(Number(searchParams.get("offset")) || 0, 0);

    const whereClause = { memberId: member.id };

    const [redemptions, total] = await Promise.all([
      prisma.rewardRedemption.findMany({
        where: whereClause,
        include: { reward: true },
        orderBy: { redeemedAt: "desc" },
        take,
        skip,
      }),
      prisma.rewardRedemption.count({ where: whereClause }),
    ]);

    const pending = redemptions.filter((r) => !r.isFulfilled);
    const fulfilled = redemptions.filter((r) => r.isFulfilled);

    return NextResponse.json({
      redemptions,
      pending,
      fulfilled,
      stats: {
        total,
        pendingCount: pending.length,
        fulfilledCount: fulfilled.length,
      },
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip + take < total,
      },
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/rewards/my-redemptions", method: "GET" });
  }
}
