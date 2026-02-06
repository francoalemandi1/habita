import { prisma } from "./prisma";

import type { Assignment } from "@prisma/client";

interface AchievementCheck {
  code: string;
  check: (memberId: string, context?: unknown) => Promise<boolean>;
}

/**
 * Achievement definitions with their unlock conditions.
 */
const ACHIEVEMENT_CHECKS: AchievementCheck[] = [
  {
    code: "FIRST_TASK",
    check: async (memberId) => {
      const count = await prisma.assignment.count({
        where: {
          memberId,
          status: { in: ["COMPLETED", "VERIFIED"] },
        },
      });
      return count === 1;
    },
  },
  {
    code: "TASKS_10",
    check: async (memberId) => {
      const count = await prisma.assignment.count({
        where: {
          memberId,
          status: { in: ["COMPLETED", "VERIFIED"] },
        },
      });
      return count >= 10;
    },
  },
  {
    code: "TASKS_50",
    check: async (memberId) => {
      const count = await prisma.assignment.count({
        where: {
          memberId,
          status: { in: ["COMPLETED", "VERIFIED"] },
        },
      });
      return count >= 50;
    },
  },
  {
    code: "TASKS_100",
    check: async (memberId) => {
      const count = await prisma.assignment.count({
        where: {
          memberId,
          status: { in: ["COMPLETED", "VERIFIED"] },
        },
      });
      return count >= 100;
    },
  },
  {
    code: "LEVEL_5",
    check: async (memberId) => {
      const level = await prisma.memberLevel.findUnique({
        where: { memberId },
      });
      return (level?.level ?? 0) >= 5;
    },
  },
  {
    code: "LEVEL_10",
    check: async (memberId) => {
      const level = await prisma.memberLevel.findUnique({
        where: { memberId },
      });
      return (level?.level ?? 0) >= 10;
    },
  },
  {
    code: "EARLY_BIRD",
    check: async (_memberId, context) => {
      if (!context) return false;
      const assignment = context as Assignment;
      if (!assignment.completedAt) return false;
      const hour = new Date(assignment.completedAt).getHours();
      return hour < 8;
    },
  },
  {
    code: "STREAK_3",
    check: async (memberId) => {
      const streak = await calculateStreak(memberId);
      return streak >= 3;
    },
  },
  {
    code: "STREAK_7",
    check: async (memberId) => {
      const streak = await calculateStreak(memberId);
      return streak >= 7;
    },
  },
  {
    code: "STREAK_30",
    check: async (memberId) => {
      const streak = await calculateStreak(memberId);
      return streak >= 30;
    },
  },
  {
    code: "TEAM_PLAYER",
    check: async (memberId) => {
      const acceptedTransfers = await prisma.taskTransfer.count({
        where: {
          toMemberId: memberId,
          status: "ACCEPTED",
        },
      });
      return acceptedTransfers >= 1;
    },
  },
];

/**
 * Calculate the current streak (consecutive days with completed tasks).
 */
async function calculateStreak(memberId: string): Promise<number> {
  const completedAssignments = await prisma.assignment.findMany({
    where: {
      memberId,
      status: { in: ["COMPLETED", "VERIFIED"] },
      completedAt: { not: null },
    },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });

  if (completedAssignments.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = today;

  // Get unique completion days
  const completionDays = new Set<string>();
  for (const a of completedAssignments) {
    if (a.completedAt) {
      const day = new Date(a.completedAt);
      day.setHours(0, 0, 0, 0);
      completionDays.add(day.toISOString());
    }
  }

  // Count consecutive days backwards from today
  while (true) {
    const dayStr = currentDate.toISOString();
    if (completionDays.has(dayStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (streak === 0) {
      // Allow starting from yesterday if nothing today yet
      currentDate.setDate(currentDate.getDate() - 1);
      const yesterdayStr = currentDate.toISOString();
      if (completionDays.has(yesterdayStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return streak;
}

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
  // Get already unlocked achievements
  const unlocked = await prisma.memberAchievement.findMany({
    where: { memberId },
    select: { achievementId: true },
  });

  const unlockedIds = new Set(unlocked.map((u) => u.achievementId));

  // Get all achievements
  const allAchievements = await prisma.achievement.findMany();
  const achievementMap = new Map(allAchievements.map((a) => [a.code, a]));

  const newlyUnlocked: { code: string; name: string; xpReward: number }[] = [];

  // Check each achievement
  for (const check of ACHIEVEMENT_CHECKS) {
    const achievement = achievementMap.get(check.code);
    if (!achievement) continue;
    if (unlockedIds.has(achievement.id)) continue;

    const isUnlocked = await check.check(memberId, context);
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

/**
 * Get member's current streak.
 */
export { calculateStreak };
