import { prisma } from "./prisma";

import type { Assignment } from "@prisma/client";

/** Pre-computed values fetched once per checkAndUnlockAchievements call */
interface PrecomputedData {
  completedCount: number;
  currentLevel: number;
  acceptedTransfers: number;
}

interface AchievementCheck {
  code: string;
  check: (precomputed: PrecomputedData, context?: unknown) => boolean;
}

/**
 * Achievement definitions with their unlock conditions.
 * All checks use pre-computed data — no DB queries inside checks.
 */
const ACHIEVEMENT_CHECKS: AchievementCheck[] = [
  { code: "FIRST_TASK", check: (p) => p.completedCount === 1 },
  { code: "TASKS_10", check: (p) => p.completedCount >= 10 },
  { code: "TASKS_50", check: (p) => p.completedCount >= 50 },
  { code: "TASKS_100", check: (p) => p.completedCount >= 100 },
  { code: "LEVEL_5", check: (p) => p.currentLevel >= 5 },
  { code: "LEVEL_10", check: (p) => p.currentLevel >= 10 },
  {
    code: "EARLY_BIRD",
    check: (_p, context) => {
      if (!context) return false;
      const assignment = context as Assignment;
      if (!assignment.completedAt) return false;
      const hour = new Date(assignment.completedAt).getHours();
      return hour < 8;
    },
  },
  { code: "TEAM_PLAYER", check: (p) => p.acceptedTransfers >= 1 },
];

/**
 * Check and unlock any new achievements for a member.
 * Call this after completing a task.
 *
 * @returns Array of newly unlocked achievements
 */
export async function checkAndUnlockAchievements(
  memberId: string,
  context?: unknown
): Promise<{ code: string; name: string; xpReward: number }[]> {
  // Pre-compute all data needed for checks in parallel (1 round-trip)
  const [unlocked, allAchievements, completedCount, level, acceptedTransfers] =
    await Promise.all([
      prisma.memberAchievement.findMany({
        where: { memberId },
        select: { achievementId: true },
      }),
      prisma.achievement.findMany(),
      prisma.assignment.count({
        where: { memberId, status: { in: ["COMPLETED", "VERIFIED"] } },
      }),
      prisma.memberLevel.findUnique({ where: { memberId } }),
      prisma.taskTransfer.count({
        where: { toMemberId: memberId, status: "ACCEPTED" },
      }),
    ]);

  const unlockedIds = new Set(unlocked.map((u) => u.achievementId));
  const achievementMap = new Map(allAchievements.map((a) => [a.code, a]));

  const precomputed: PrecomputedData = {
    completedCount,
    currentLevel: level?.level ?? 0,
    acceptedTransfers,
  };

  const newlyUnlocked: { code: string; name: string; xpReward: number }[] = [];

  // Check each achievement using pre-computed data (no DB calls)
  for (const check of ACHIEVEMENT_CHECKS) {
    const achievement = achievementMap.get(check.code);
    if (!achievement) continue;
    if (unlockedIds.has(achievement.id)) continue;

    const isUnlocked = check.check(precomputed, context);
    if (isUnlocked) {
      // Unlock the achievement
      await prisma.$transaction(async (tx) => {
        await tx.memberAchievement.create({
          data: {
            memberId,
            achievementId: achievement.id,
          },
        });

        // Award XP
        if (achievement.xpReward > 0) {
          await tx.memberLevel.upsert({
            where: { memberId },
            update: {
              xp: { increment: achievement.xpReward },
            },
            create: {
              memberId,
              xp: achievement.xpReward,
              level: 1,
            },
          });

          // Update level if needed
          const level = await tx.memberLevel.findUnique({
            where: { memberId },
          });
          if (level) {
            const newLevel = Math.floor(level.xp / 100) + 1;
            if (newLevel > level.level) {
              await tx.memberLevel.update({
                where: { memberId },
                data: { level: newLevel },
              });
            }
          }
        }
      });

      newlyUnlocked.push({
        code: achievement.code,
        name: achievement.name,
        xpReward: achievement.xpReward,
      });
    }
  }

  return newlyUnlocked;
}
