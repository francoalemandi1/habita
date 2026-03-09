import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { generateBriefing } from "@/lib/llm/briefing";
import { buildRegionalContext } from "@/lib/llm/regional-context";
import { getLocalDateString, getDayBoundariesWithYesterday } from "@/lib/date-boundaries";

import type { BriefingContext, BriefingResponse } from "@/lib/llm/briefing";

// Daily cache: one briefing per member per day
interface CacheEntry {
  data: BriefingResponse;
  expiresAt: number;
}

const briefingCache = new Map<string, CacheEntry>();

function getCacheKey(memberId: string, dateStr: string): string {
  return `${memberId}:${dateStr}`;
}

function getFromCache(key: string): BriefingResponse | null {
  const entry = briefingCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    briefingCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: BriefingResponse, expiresAt: number): void {
  briefingCache.set(key, { data, expiresAt });
}

/**
 * GET /api/briefing
 * Daily briefing: 3 contextual lines shown once per day.
 * Works with and without AI enabled (deterministic fallback).
 */
export async function GET() {
  try {
    const member = await requireMember();

    // Build regional context for timezone-aware date calculations
    const household = await prisma.household.findUnique({
      where: { id: member.householdId },
      select: { latitude: true, longitude: true, timezone: true, country: true, city: true },
    });

    const regionalContext = await buildRegionalContext(household ?? {});

    // Compute today's date string in local timezone for cache key
    const localDateStr = getLocalDateString(new Date(), household?.timezone);
    const cacheKey = getCacheKey(member.id, localDateStr);

    const cached = getFromCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Compute timezone-aware yesterday boundaries
    const { startOfYesterday, startOfToday, endOfToday } = getDayBoundariesWithYesterday(
      household?.timezone
    );

    // Fetch data in parallel
    const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Month boundaries for expense queries
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // 3 days from now for upcoming services
    const threeDaysFromNow = new Date(startOfToday.getTime() + 3 * 24 * 60 * 60 * 1000);

    const [
      yesterdayCompleted,
      todayPending,
      weeklyCompleted,
      thisMonthExpenses,
      lastMonthExpenses,
      activeService,
      sharedFund,
      dailyDeals,
    ] = await Promise.all([
      prisma.assignment.findMany({
        where: {
          householdId: member.householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
          completedAt: { gte: startOfYesterday, lt: startOfToday },
        },
        select: {
          task: { select: { name: true } },
        },
        take: 5,
      }),
      prisma.assignment.findMany({
        where: {
          householdId: member.householdId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueDate: { lte: endOfToday },
          NOT: {
            transfers: {
              some: { status: { in: ["PENDING", "ACCEPTED"] } },
            },
          },
        },
        include: {
          task: { select: { name: true } },
          member: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 100,
      }),
      prisma.assignment.findMany({
        where: {
          householdId: member.householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
          completedAt: { gte: sevenDaysAgo },
        },
        select: {
          member: { select: { name: true } },
        },
        take: 200,
      }),
      // Current month expense total
      prisma.expense.aggregate({
        where: {
          householdId: member.householdId,
          date: { gte: startOfThisMonth, lte: endOfThisMonth },
        },
        _sum: { amount: true },
      }),
      // Last month expense total (for delta calculation)
      prisma.expense.aggregate({
        where: {
          householdId: member.householdId,
          date: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amount: true },
      }),
      // Upcoming service due within 3 days
      prisma.service.findFirst({
        where: {
          householdId: member.householdId,
          isActive: true,
          nextDueDate: { lte: threeDaysFromNow },
        },
        orderBy: { nextDueDate: "asc" },
        select: { title: true, nextDueDate: true },
      }),
      // Shared fund (target + compute balance)
      prisma.sharedFund.findFirst({
        where: { householdId: member.householdId },
        select: {
          id: true,
          monthlyTarget: true,
        },
      }),
      // Daily deals count scoped to city
      prisma.dealCacheCity.count({
        where: {
          city: (household?.city ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(),
          expiresAt: { gte: now },
        },
      }),
    ]);

    // Fund balance: contributions this month minus expenses this month
    let fundCurrentBalance: number | undefined;
    let fundMonthlyTarget: number | undefined;

    if (sharedFund) {
      const currentMonthPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const [fundContributions, fundExpenses] = await Promise.all([
        prisma.fundContribution.aggregate({
          where: { fundId: sharedFund.id, period: currentMonthPeriod },
          _sum: { amount: true },
        }),
        prisma.fundExpense.aggregate({
          where: {
            fundId: sharedFund.id,
            date: { gte: startOfThisMonth, lte: endOfThisMonth },
          },
          _sum: { amount: true },
        }),
      ]);

      const contribTotal = fundContributions._sum.amount?.toNumber() ?? 0;
      const expensesTotal = fundExpenses._sum.amount?.toNumber() ?? 0;
      fundCurrentBalance = contribTotal - expensesTotal;

      if (sharedFund.monthlyTarget !== null && sharedFund.monthlyTarget !== undefined) {
        fundMonthlyTarget = sharedFund.monthlyTarget.toNumber();
      }
    }

    // My pending tasks
    const myPending = todayPending.filter((a) => a.memberId === member.id);

    // Pending count by member
    const pendingByMemberMap = new Map<string, { name: string; pending: number }>();
    for (const a of todayPending) {
      const existing = pendingByMemberMap.get(a.memberId);
      if (existing) {
        existing.pending++;
      } else {
        pendingByMemberMap.set(a.memberId, { name: a.member.name, pending: 1 });
      }
    }

    // Weekly top contributors
    const weeklyByMember = new Map<string, number>();
    for (const a of weeklyCompleted) {
      weeklyByMember.set(a.member.name, (weeklyByMember.get(a.member.name) ?? 0) + 1);
    }
    const weeklyTopContributors = Array.from(weeklyByMember.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Expense totals and delta
    const thisMonthTotal = thisMonthExpenses._sum.amount?.toNumber() ?? 0;
    const lastMonthTotal = lastMonthExpenses._sum.amount?.toNumber() ?? 0;

    let monthlyExpenseTotal: number | undefined;
    let monthlyExpenseDelta: number | undefined;

    if (thisMonthTotal > 0) {
      monthlyExpenseTotal = thisMonthTotal;
      if (lastMonthTotal > 0) {
        monthlyExpenseDelta = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
      }
    }

    // Upcoming service
    let upcomingServiceTitle: string | undefined;
    let upcomingServiceDays: number | undefined;

    if (activeService) {
      const dueDate = new Date(activeService.nextDueDate);
      const diffMs = dueDate.getTime() - startOfToday.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      // Only include if it's within 3 days (including today, possibly past due)
      if (diffDays <= 3) {
        upcomingServiceTitle = activeService.title;
        upcomingServiceDays = Math.max(0, diffDays);
      }
    }

    // Daily deals
    const hasDailyDeal = dailyDeals > 0;

    const briefingContext: BriefingContext = {
      currentMember: member.name,
      timeOfDay: regionalContext.timeOfDay,
      yesterdayCompletedCount: yesterdayCompleted.length,
      yesterdayCompletedNames: yesterdayCompleted.map((a) => a.task.name),
      todayPendingCount: myPending.length,
      todayPendingNames: myPending.slice(0, 5).map((a) => a.task.name),
      pendingByMember: Array.from(pendingByMemberMap.values()),
      weeklyCompletedCount: weeklyCompleted.length,
      weeklyTopContributors,
      monthlyExpenseTotal,
      monthlyExpenseDelta,
      fundMonthlyTarget,
      fundCurrentBalance,
      upcomingServiceTitle,
      upcomingServiceDays,
      hasDailyDeal,
      dealCategory: undefined,
    };

    const briefing = generateBriefing(briefingContext);

    // Cache until end of local day
    setCache(cacheKey, briefing, endOfToday.getTime());

    return NextResponse.json(briefing);
  } catch (error) {
    console.error("GET /api/briefing error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Error getting briefing" },
      { status: 500 }
    );
  }
}
