import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalDayOfWeek } from "@/lib/llm/regional-context";
import { formatLocalDate, sendWeeklyInsightsToAdults } from "@/lib/email-service";

import type { NextRequest } from "next/server";

interface HouseholdInsightsResult {
  householdId: string;
  householdName: string;
  success: boolean;
  emailsSent: number;
  error?: string;
}

/**
 * POST /api/cron/weekly-insights
 * Sends a weekly insights email to adult members of households
 * whose insights day (planningDay - 1) matches today in their timezone.
 * Runs every 6 hours to cover all timezones. Protected by CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
    }
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    const allHouseholds = await prisma.household.findMany({
      where: {
        planningDay: { not: null },
        timezone: { not: null },
        members: { some: { isActive: true } },
      },
      select: { id: true, name: true, planningDay: true, timezone: true },
    });

    // Insights go out the day BEFORE planningDay
    const households = allHouseholds.filter((h) => {
      const localDay = getLocalDayOfWeek(now, h.timezone!);
      const insightsDay = (h.planningDay! - 1 + 7) % 7;
      return localDay === insightsDay;
    });

    const results: HouseholdInsightsResult[] = [];

    for (const household of households) {
      try {
        const emailsSent = await processHouseholdInsights(household.id, household.name, household.timezone!, now);

        results.push({
          householdId: household.id,
          householdName: household.name,
          success: true,
          emailsSent,
        });
      } catch (error) {
        console.error(`Weekly insights failed for household ${household.name}:`, error);
        results.push({
          householdId: household.id,
          householdName: household.name,
          success: false,
          emailsSent: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalEmails = results.reduce((sum, r) => sum + r.emailsSent, 0);

    return NextResponse.json({
      success: true,
      summary: {
        householdsEvaluated: allHouseholds.length,
        householdsMatchedToday: households.length,
        householdsSuccessful: successCount,
        totalEmailsSent: totalEmails,
      },
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/cron/weekly-insights error:", error);
    return NextResponse.json(
      { error: "Error processing weekly insights" },
      { status: 500 }
    );
  }
}

async function processHouseholdInsights(
  householdId: string,
  householdName: string,
  timezone: string,
  now: Date
): Promise<number> {
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [members, weeklyCompletions, pendingCount, weekCompletions] =
    await Promise.all([
      prisma.member.findMany({
        where: { householdId, isActive: true },
        select: {
          id: true,
          name: true,
          memberType: true,
          user: { select: { email: true } },
        },
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
      prisma.assignment.count({
        where: { householdId, status: { in: ["PENDING", "IN_PROGRESS"] } },
      }),
      prisma.assignment.findMany({
        where: {
          householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
          completedAt: { gte: sevenDaysAgo },
        },
        select: { completedAt: true },
      }),
    ]);

  // Weekly completions map
  const weeklyMap = new Map(weeklyCompletions.map((c) => [c.memberId, c._count.id]));

  // Daily completions (last 7 days)
  const countsByDate = new Map<string, number>();
  for (const c of weekCompletions) {
    if (c.completedAt) {
      const key = c.completedAt.toISOString().split("T")[0] ?? "";
      countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
    }
  }

  const dailyCompletions: Array<{ date: string; count: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const key = date.toISOString().split("T")[0] ?? "";
    dailyCompletions.push({ date: key, count: countsByDate.get(key) ?? 0 });
  }

  const totalWeeklyCompleted = weeklyCompletions.reduce((sum, c) => sum + c._count.id, 0);

  // Filter adults for email
  const adultEmails = members
    .filter((m) => m.memberType === "ADULT" && m.user.email)
    .map((m) => ({ email: m.user.email }));

  if (adultEmails.length === 0) return 0;

  await sendWeeklyInsightsToAdults(adultEmails, {
    householdName,
    localDateLabel: formatLocalDate(now, timezone),
    memberStats: members.map((m) => ({
      memberName: m.name,
      weeklyCompleted: weeklyMap.get(m.id) ?? 0,
    })),
    totals: {
      completedThisWeek: totalWeeklyCompleted,
      pendingCount,
    },
    dailyCompletions,
  });

  return adultEmails.length;
}

/**
 * GET /api/cron/weekly-insights
 * Status endpoint for monitoring. Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    status: "ready",
    endpoint: "POST /api/cron/weekly-insights",
    description: "Sends weekly insights email the day before each household's planning day",
    schedule: "Every 6 hours (covers all timezones)",
  });
}
