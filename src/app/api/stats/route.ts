import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";

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
    ] = await Promise.all([
      prisma.member.findMany({
        where: { householdId, isActive: true },
        select: { id: true, name: true, memberType: true },
      }),
      prisma.assignment.groupBy({
        by: ["memberId"],
        where: {
          householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
          completedAt: { gte: startOfWeek },
        },
        _count: { id: true },
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
    ]);

    const weeklyCompletionMap = new Map(
      weeklyCompletions.map((c) => [c.memberId, c._count.id])
    );
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
      weeklyTasks: weeklyCompletionMap.get(m.id) ?? 0,
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

    return NextResponse.json({
      memberStats,
      totals: {
        completed: totalTasksCompleted,
        pending: pendingTasks,
        members: members.length,
      },
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        taskName: a.task.name,
        memberName: a.member.name,
        completedAt: a.completedAt,
      })),
      dailyCompletions,
    });
  } catch (error) {
    console.error("GET /api/stats error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error fetching stats" }, { status: 500 });
  }
}
