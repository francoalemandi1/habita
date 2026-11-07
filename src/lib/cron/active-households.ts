import { prisma } from "@/lib/prisma";

/** Households with no tracked activity in this window stop receiving proactive cron notifications. */
export const ACTIVE_HOUSEHOLD_WINDOW_DAYS = 30;

/** Pure helper: start of the activity window, `windowDays` before `now`. */
export function getActiveWindowStart(
  now: Date,
  windowDays: number = ACTIVE_HOUSEHOLD_WINDOW_DAYS,
): Date {
  return new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
}

/**
 * A household is active if it was created, or had any tracked activity, within
 * the last ACTIVE_HOUSEHOLD_WINDOW_DAYS days: an expense, a completed
 * assignment, a shopping list item, a settlement, a task, or any member's
 * mobile session being used. Opening the app again makes a household active
 * again automatically — there is no persisted "inactive" flag.
 */
export async function getActiveHouseholdIds(now: Date): Promise<Set<string>> {
  const windowStart = getActiveWindowStart(now);

  const [
    recentHouseholds,
    expenseHouseholds,
    completedAssignmentHouseholds,
    shoppingListHouseholds,
    settlementHouseholds,
    taskHouseholds,
    recentSessionUsers,
  ] = await Promise.all([
    prisma.household.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { id: true },
    }),
    prisma.expense.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { householdId: true },
      distinct: ["householdId"],
    }),
    prisma.assignment.findMany({
      where: { completedAt: { gte: windowStart } },
      select: { householdId: true },
      distinct: ["householdId"],
    }),
    prisma.shoppingListItem.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { householdId: true },
      distinct: ["householdId"],
    }),
    prisma.settlement.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { householdId: true },
      distinct: ["householdId"],
    }),
    prisma.task.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { householdId: true },
      distinct: ["householdId"],
    }),
    prisma.mobileAuthSession.findMany({
      where: { lastUsedAt: { gte: windowStart } },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  const activeHouseholdIds = new Set<string>();
  for (const household of recentHouseholds) activeHouseholdIds.add(household.id);
  for (const row of expenseHouseholds) activeHouseholdIds.add(row.householdId);
  for (const row of completedAssignmentHouseholds) activeHouseholdIds.add(row.householdId);
  for (const row of shoppingListHouseholds) activeHouseholdIds.add(row.householdId);
  for (const row of settlementHouseholds) activeHouseholdIds.add(row.householdId);
  for (const row of taskHouseholds) activeHouseholdIds.add(row.householdId);

  // MobileAuthSession has no householdId — resolve the active users' households.
  if (recentSessionUsers.length > 0) {
    const membersOfActiveUsers = await prisma.member.findMany({
      where: { userId: { in: recentSessionUsers.map((session) => session.userId) } },
      select: { householdId: true },
      distinct: ["householdId"],
    });
    for (const member of membersOfActiveUsers) activeHouseholdIds.add(member.householdId);
  }

  return activeHouseholdIds;
}

/**
 * Fail-closed wrapper for cron callers: if activity detection fails, no
 * household counts as active (proactive sends are skipped) but the caller's
 * other jobs — billing, cleanups, plan generation — still run.
 */
export async function getActiveHouseholdIdsOrEmpty(now: Date): Promise<Set<string>> {
  try {
    return await getActiveHouseholdIds(now);
  } catch (error) {
    console.error("[cron] Active-household detection failed; skipping proactive sends:", error);
    return new Set<string>();
  }
}
