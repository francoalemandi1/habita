import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoAssignAllTasks } from "@/lib/assignment-algorithm";
import { getLocalDayOfWeek } from "@/lib/llm/regional-context";
import { deliverNotificationToMembers } from "@/lib/push-delivery";
import { handleApiError } from "@/lib/api-response";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { getActiveHouseholdIdsOrEmpty } from "@/lib/cron/active-households";
import { APP_ROUTES } from "@habita/contracts";

import type { NextRequest } from "next/server";

export const maxDuration = 300;

interface HouseholdPlanResult {
  householdId: string;
  householdName: string;
  success: boolean;
  assignmentsCreated: number;
  error?: string;
}

/**
 * Generates and applies task distribution for households whose planningDay matches today.
 */
async function runWeeklyPlanCron() {
  try {
    const now = new Date();
    const activeHouseholdIds = await getActiveHouseholdIdsOrEmpty(now);

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
    const plannedToday = allHouseholds.filter((h) => {
      const localDay = getLocalDayOfWeek(now, h.timezone!);
      return localDay === h.planningDay;
    });

    // Inactive households get no new plan, so returning users don't find weeks of stale assignments
    const households = plannedToday.filter((h) => activeHouseholdIds.has(h.id));
    console.log(
      `[cron/weekly-plan] Planning ${households.length}/${plannedToday.length} households ` +
        `(skipped ${plannedToday.length - households.length} inactive)`,
    );

    const results: HouseholdPlanResult[] = [];

    for (const household of households) {
      try {
        const result = await autoAssignAllTasks(household.id);

        results.push({
          householdId: household.id,
          householdName: household.name,
          success: result.success,
          assignmentsCreated: result.assignmentsCreated,
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
            actionUrl: APP_ROUTES.tareas,
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
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const totalAssignments = results.reduce((sum, r) => sum + r.assignmentsCreated, 0);
    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      summary: {
        householdsEvaluated: allHouseholds.length,
        householdsMatchedToday: households.length,
        householdsSuccessful: successCount,
        totalAssignmentsCreated: totalAssignments,
      },
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/cron/weekly-plan", method: "POST" });
  }
}

/**
 * GET and POST /api/cron/weekly-plan
 * Vercel Cron sends GET; manual/internal triggers send POST. Both run the same job.
 * Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const auth = authorizeCronRequest(request);
  if (!auth.isAuthorized) return auth.response;
  return runWeeklyPlanCron();
}

export const POST = GET;
