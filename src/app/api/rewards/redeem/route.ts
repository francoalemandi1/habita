import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { redeemRewardSchema } from "@/lib/validations/gamification";
import { createNotification } from "@/lib/notification-service";
import { handleApiError } from "@/lib/api-response";
import { InsufficientPointsError } from "@/lib/errors";

import type { NextRequest } from "next/server";

/**
 * POST /api/rewards/redeem
 * Redeem a reward using points
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body: unknown = await request.json();

    const validation = redeemRewardSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { rewardId } = validation.data;

    // Get the reward (outside transaction — read-only, immutable)
    const reward = await prisma.householdReward.findFirst({
      where: {
        id: rewardId,
        householdId: member.householdId,
        isActive: true,
      },
    });

    if (!reward) {
      return NextResponse.json({ error: "Recompensa no encontrada" }, { status: 404 });
    }

    // Atomic balance check + redemption to prevent double-spending
    const result = await prisma.$transaction(async (tx) => {
      const [level, redemptions] = await Promise.all([
        tx.memberLevel.findUnique({
          where: { memberId: member.id },
          select: { xp: true },
        }),
        tx.rewardRedemption.findMany({
          where: { memberId: member.id },
          select: { reward: { select: { pointsCost: true } } },
        }),
      ]);

      const spentPoints = redemptions.reduce((sum, r) => sum + r.reward.pointsCost, 0);
      const availablePoints = (level?.xp ?? 0) - spentPoints;

      if (availablePoints < reward.pointsCost) {
        throw new InsufficientPointsError(reward.pointsCost, availablePoints);
      }

      const redemption = await tx.rewardRedemption.create({
        data: { memberId: member.id, rewardId: reward.id },
        select: { id: true, redeemedAt: true, rewardId: true },
      });

      return {
        redemption: { ...redemption, reward },
        pointsSpent: reward.pointsCost,
        remainingPoints: availablePoints - reward.pointsCost,
      };
    });

    // Notify the member about their redemption
    await createNotification({
      memberId: member.id,
      type: "REWARD_REDEEMED",
      title: "Recompensa canjeada",
      message: `Canjeaste "${reward.name}" por ${reward.pointsCost} puntos`,
      actionUrl: "/rewards",
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: "/api/rewards/redeem", method: "POST" });
  }
}
