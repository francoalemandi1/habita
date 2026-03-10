import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoAssignAllTasks } from "@/lib/assignment-algorithm";
import { isAIEnabled } from "@/lib/llm/provider";
import { getLocalDayOfWeek } from "@/lib/llm/regional-context";
import { deliverNotificationToMembers } from "@/lib/push-delivery";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

export const maxDuration = 300;

interface HouseholdPlanResult {
  householdId: string;
  householdName: string;
  success: boolean;
  assignmentsCreated: number;
  method: "ai" | "algorithm";
  error?: string;
}

/**
 * POST /api/cron/weekly-plan
 * Generates and applies task distribution for households whose planningDay matches today.
 * Runs every 6 hours to cover all timezones. Protected by CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Only process households with a configured planning day and timezone
    const allHouseholds = await prisma.household.findMany({
      where: {
        planningDay: { not: null },
        timezone: { not: null },
        members: { some: { isActive: true } },
        tasks: { some: { isActive: true } },
      },
      select: { id: true, name: true, planningDay: true, timezone: true },
    });

    // Filter to households where today (in their timezone) matches their planningDay
    const households = allHouseholds.filter((h) => {
      const localDay = getLocalDayOfWeek(now, h.timezone!);
      return localDay === h.planningDay;
    });

    const results: HouseholdPlanResult[] = [];
    const aiEnabled = isAIEnabled();

    for (const household of households) {
      try {
        const result = await autoAssignAllTasks(household.id, { useAI: aiEnabled });

        results.push({
          householdId: household.id,
          householdName: household.name,
          success: result.success,
          assignmentsCreated: result.assignmentsCreated,
          method: result.method,
        });

        if (result.success && result.assignmentsCreated > 0) {
          // In-app notifications
          const householdMembers = await prisma.member.findMany({
            where: { householdId: household.id, isActive: true },
            select: { id: true },
          });
          await deliverNotificationToMembers({
            memberIds: householdMembers.map((m) => m.id),
            type: "PLAN_READY",
            title: "Nuevo plan semanal",
            message: `Se asignaron ${result.assignmentsCreated} tareas para esta semana`,
            actionUrl: "/my-tasks",
            householdTimezone: household.timezone,
          });

        }
      } catch (error) {
        console.error(`Weekly plan failed for household ${household.name}:`, error);
        results.push({
          householdId: household.id,
          householdName: household.name,
          success: false,
          assignmentsCreated: 0,
          method: "algorithm",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const totalAssignments = results.reduce((sum, r) => sum + r.assignmentsCreated, 0);
    const successCount = results.filter((r) => r.success).length;
    const aiCount = results.filter((r) => r.method === "ai").length;

    return NextResponse.json({
      success: true,
      summary: {
        householdsEvaluated: allHouseholds.length,
        householdsMatchedToday: households.length,
        householdsSuccessful: successCount,
        totalAssignmentsCreated: totalAssignments,
        usedAI: aiCount,
        usedAlgorithm: results.length - aiCount,
      },
      aiEnabled,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/cron/weekly-plan", method: "POST" });
  }
}

/**
 * GET /api/cron/weekly-plan
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

  try {
    const aiEnabled = isAIEnabled();

    return NextResponse.json({
      status: "ready",
      endpoint: "POST /api/cron/weekly-plan",
      description: "Generates task distribution for households on their configured planning day",
      aiEnabled,
      schedule: "Every 6 hours (covers all timezones)",
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/cron/weekly-plan", method: "GET" });
  }
}
