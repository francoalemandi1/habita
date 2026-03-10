import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { getWeekMonday } from "@/lib/calendar-utils";
import { handleApiError } from "@/lib/api-response";

/**
 * GET /api/stats
 * Get household statistics
 */
export async function GET() {
  try {
    const member = await requireMember();
    const householdId = member.householdId;

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Daily completions date range (needed before Promise.all)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // Streak lookback: 52 weeks
    const fiftyTwoWeeksAgo = new Date(now);
    fiftyTwoWeeksAgo.setDate(fiftyTwoWeeksAgo.getDate() - 364);
    fiftyTwoWeeksAgo.setHours(0, 0, 0, 0);

    // All queries are independent — run in parallel
    const [
      members,
      weeklyCompletions,
      monthlyCompletions,
      totalCompletions,
      totalTasksCompleted,
      pendingTasks,
      recentActivity,
      weekCompletions,
      streakCompletions,
    ] = await Promise.all([
      prisma.member.findMany({
        where: { householdId, isActive: true },
        select: { id: true, name: true, memberType: true },
      }),
      prisma.assignment.findMany({
        where: {
          householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
          completedAt: { gte: startOfWeek },
        },
        select: {
          memberId: true,
          task: { select: { weight: true } },
        },
      }),
      prisma.assignment.groupBy({
        by: ["memberId"],
        where: {
          householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
          completedAt: { gte: startOfMonth },
        },
        _count: { id: true },
      }),
      prisma.assignment.groupBy({
        by: ["memberId"],
        where: {
          householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
        },
        _count: { id: true },
      }),
      prisma.assignment.count({
        where: {
          householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
        },
      }),
      prisma.assignment.count({
        where: {
          householdId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      }),
      prisma.assignment.findMany({
        where: {
          householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
          completedAt: { gte: startOfWeek },
        },
        include: {
          task: { select: { name: true } },
          member: { select: { name: true } },
        },
        orderBy: { completedAt: "desc" },
        take: 10,
      }),
      prisma.assignment.findMany({
        where: {
          householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
          completedAt: { gte: sevenDaysAgo, lte: endOfToday },
        },
        select: { completedAt: true },
      }),
      prisma.assignment.findMany({
        where: {
          householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
          completedAt: { gte: fiftyTwoWeeksAgo },
        },
        select: { memberId: true, completedAt: true },
      }),
    ]);

    const weeklyCountMap = new Map<string, number>();
    const weeklyPointsMap = new Map<string, number>();
    for (const c of weeklyCompletions) {
      weeklyCountMap.set(c.memberId, (weeklyCountMap.get(c.memberId) ?? 0) + 1);
      weeklyPointsMap.set(c.memberId, (weeklyPointsMap.get(c.memberId) ?? 0) + c.task.weight);
    }
    const monthlyCompletionMap = new Map(
      monthlyCompletions.map((c) => [c.memberId, c._count.id])
    );
    const totalCompletionMap = new Map(
      totalCompletions.map((c) => [c.memberId, c._count.id])
    );

    // Build member stats
    const memberStats = members.map((m) => ({
      id: m.id,
      name: m.name,
      memberType: m.memberType,
      weeklyTasks: weeklyCountMap.get(m.id) ?? 0,
      weeklyPoints: weeklyPointsMap.get(m.id) ?? 0,
      monthlyTasks: monthlyCompletionMap.get(m.id) ?? 0,
      totalTasks: totalCompletionMap.get(m.id) ?? 0,
    }));

    const countsByDate = new Map<string, number>();
    for (const c of weekCompletions) {
      if (c.completedAt) {
        const key = c.completedAt.toISOString().split("T")[0] ?? "";
        countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
      }
    }

    const dailyCompletions: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().split("T")[0] ?? "";
      dailyCompletions.push({ date: key, count: countsByDate.get(key) ?? 0 });
    }

    // Compute household streak: consecutive weeks where ALL active members completed ≥1
    const activeMemberIds = new Set(members.map((m) => m.id));
    const completionsByWeek = new Map<string, Set<string>>();
    for (const c of streakCompletions) {
      if (c.completedAt) {
        const monday = getWeekMonday(c.completedAt);
        const weekKey = monday.toISOString().split("T")[0] ?? "";
        if (!completionsByWeek.has(weekKey)) {
          completionsByWeek.set(weekKey, new Set());
        }
        completionsByWeek.get(weekKey)!.add(c.memberId);
      }
    }

    let householdStreak = 0;
    const currentMonday = getWeekMonday(now);
    const walkDate = new Date(currentMonday);
    while (true) {
      const weekKey = walkDate.toISOString().split("T")[0] ?? "";
      const membersThisWeek = completionsByWeek.get(weekKey);
      const allActive = membersThisWeek != null
        && Array.from(activeMemberIds).every((id) => membersThisWeek.has(id));
      if (allActive) {
        householdStreak++;
        walkDate.setDate(walkDate.getDate() - 7);
      } else {
        break;
      }
    }

    return NextResponse.json({
      memberStats,
      totals: {
        completed: totalTasksCompleted,
        pending: pendingTasks,
        members: members.length,
      },
      householdStreak,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        taskName: a.task.name,
        memberName: a.member.name,
        completedAt: a.completedAt,
      })),
      dailyCompletions,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/stats", method: "GET" });
  }
}
