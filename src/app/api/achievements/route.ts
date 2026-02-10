import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

/**
 * GET /api/achievements
 * Get all achievements and which ones the current member has unlocked
 */
export async function GET() {
  try {
    const member = await requireMember();

    const [allAchievements, memberAchievements] = await Promise.all([
      prisma.achievement.findMany({
        orderBy: { xpReward: "asc" },
        take: 200,
      }),
      prisma.memberAchievement.findMany({
        where: { memberId: member.id },
        select: {
          achievementId: true,
          unlockedAt: true,
        },
      }),
    ]);

    const unlockedMap = new Map(
      memberAchievements.map((ma) => [ma.achievementId, ma.unlockedAt])
    );

    // Combine data
    const achievements = allAchievements.map((a) => ({
      ...a,
      isUnlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id) ?? null,
    }));

    const unlocked = achievements.filter((a) => a.isUnlocked);
    const locked = achievements.filter((a) => !a.isUnlocked);

    return NextResponse.json({
      achievements,
      unlocked,
      locked,
      stats: {
        total: achievements.length,
        unlockedCount: unlocked.length,
        totalXpFromAchievements: unlocked.reduce((sum, a) => sum + a.xpReward, 0),
      },
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/achievements", method: "GET" });
  }
}
