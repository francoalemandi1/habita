import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getWeekMonday } from "@/lib/calendar-utils";
import { calculatePlanPerformance, generateAIRewards } from "@/lib/llm/ai-reward-generator";
import { createNotificationForMembers } from "@/lib/notification-service";
import { sendPlanAppliedToAdults } from "@/lib/email-service";

import type { NextRequest } from "next/server";

interface AssignmentToApply {
  taskName: string;
  memberId: string;
  memberName?: string;
  dayOfWeek?: number;
}

interface ApplyPlanBody {
  planId?: string;
  assignments: AssignmentToApply[];
}

/**
 * POST /api/ai/apply-plan
 * Apply selected assignments from a previewed plan.
 * Only creates assignments that were explicitly selected by the user.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("assignments" in body) ||
      !Array.isArray((body as ApplyPlanBody).assignments)
    ) {
      return NextResponse.json(
        { error: "Invalid request body. Expected { assignments: [...] }" },
        { status: 400 }
      );
    }

    const { assignments, planId } = body as ApplyPlanBody;

    if (assignments.length === 0) {
      return NextResponse.json({
        success: true,
        assignmentsCreated: 0,
        message: "No assignments to apply",
      });
    }

    // Read-only lookups (outside transaction for efficiency)
    const [members, tasks] = await Promise.all([
      prisma.member.findMany({
        where: { householdId: member.householdId, isActive: true },
        select: { id: true, name: true },
      }),
      prisma.task.findMany({
        where: { householdId: member.householdId, isActive: true },
        select: { id: true, name: true, frequency: true },
      }),
    ]);

    const memberIdSet = new Set(members.map((m) => m.id));
    const taskMap = new Map(
      tasks.map((t) => [t.name.toLowerCase(), t.id])
    );

    const now = new Date();

    let planStartDate: Date | undefined;
    let planEndDate: Date | undefined;
    if (planId) {
      const existingPlan = await prisma.weeklyPlan.findUnique({
        where: { id: planId },
        select: { expiresAt: true, startDate: true },
      });
      if (existingPlan) {
        planEndDate = existingPlan.expiresAt;
        planStartDate = existingPlan.startDate ?? undefined;
      }
    }

    // Use plan's explicit startDate as the reference for dayOfWeek mapping,
    // falling back to current week's Monday for legacy plans without startDate
    const referenceDate = planStartDate ?? getWeekMonday(now);

    // Build assignments data before transaction
    const assignmentsToCreate: Array<{
      taskId: string;
      memberId: string;
      householdId: string;
      dueDate: Date;
      status: "PENDING";
    }> = [];

    const skipped: string[] = [];

    // Fallback: end-of-today for assignments without dayOfWeek
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    for (const assignment of assignments) {
      const memberId = memberIdSet.has(assignment.memberId) ? assignment.memberId : undefined;
      const taskId = taskMap.get(assignment.taskName.toLowerCase());

      if (!memberId || !taskId) {
        skipped.push(`${assignment.taskName} → ${assignment.memberName ?? assignment.memberId}`);
        continue;
      }

      // Use dayOfWeek from AI plan when available (1=Mon..7=Sun), relative to plan startDate
      let dueDate: Date;
      if (assignment.dayOfWeek && assignment.dayOfWeek >= 1 && assignment.dayOfWeek <= 7) {
        dueDate = new Date(referenceDate);
        dueDate.setDate(referenceDate.getDate() + assignment.dayOfWeek - 1);
        dueDate.setHours(23, 59, 59, 999);
        // If the computed date is in the past, push to today
        if (dueDate < now) {
          dueDate = new Date(endOfToday);
        }
      } else {
        dueDate = new Date(endOfToday);
      }

      // Cap at plan end date
      if (planEndDate && dueDate > planEndDate) {
        dueDate = new Date(planEndDate);
        dueDate.setHours(23, 59, 59, 999);
      }

      assignmentsToCreate.push({
        taskId,
        memberId,
        householdId: member.householdId,
        dueDate,
        status: "PENDING",
      });
    }

    // Generate rewards for expiring APPLIED plan (best-effort, before transaction)
    try {
      const appliedPlan = await prisma.weeklyPlan.findFirst({
        where: { householdId: member.householdId, status: "APPLIED" },
        select: { id: true, createdAt: true, expiresAt: true },
      });

      if (appliedPlan) {
        const existingRewards = await prisma.householdReward.count({
          where: { planId: appliedPlan.id, isAiGenerated: true },
        });

        if (existingRewards === 0) {
          const performances = await calculatePlanPerformance(
            member.householdId,
            appliedPlan.createdAt,
            appliedPlan.expiresAt,
          );
          const rewardResult = await generateAIRewards(member.householdId, appliedPlan.id, performances);

          if (rewardResult && rewardResult.rewards.length > 0) {
            const perfMap = new Map(
              performances.map((p) => [p.memberName.toLowerCase(), p]),
            );
            const rewardsToCreate = rewardResult.rewards
              .map((r) => {
                const perf = perfMap.get(r.memberName.toLowerCase());
                if (!perf) return null;
                return {
                  householdId: member.householdId,
                  name: r.rewardName,
                  description: r.rewardDescription,
                  pointsCost: r.pointsCost,
                  category: r.category,
                  actionUrl: r.actionUrl ?? null,
                  isAiGenerated: true,
                  planId: appliedPlan.id,
                  memberId: perf.memberId,
                  completionRate: perf.completionRate,
                };
              })
              .filter((r): r is NonNullable<typeof r> => r !== null);

            if (rewardsToCreate.length > 0) {
              await prisma.householdReward.createMany({ data: rewardsToCreate });
            }
          }
        }
      }
    } catch (err) {
      console.error("Error generating rewards for expiring plan (non-blocking):", err);
    }

    // Use a single timestamp for both assignments and plan to avoid race conditions
    const appliedAt = new Date();

    // Atomic transaction: expire old plans, cancel assignments, create new, update plan status
    const result = await prisma.$transaction(async (tx) => {
      // Expire old plans (except the one we're applying)
      await tx.weeklyPlan.updateMany({
        where: {
          householdId: member.householdId,
          status: { in: ["PENDING", "APPLIED", "COMPLETED"] },
          ...(planId ? { id: { not: planId } } : {}),
        },
        data: { status: "EXPIRED" },
      });

      // Cancel ALL assignments from the old plan (including completed ones)
      const cancelled = await tx.assignment.updateMany({
        where: {
          householdId: member.householdId,
          status: { in: ["PENDING", "IN_PROGRESS", "COMPLETED", "VERIFIED"] },
        },
        data: { status: "CANCELLED" },
      });

      // Create new assignments with the same timestamp as appliedAt
      if (assignmentsToCreate.length > 0) {
        await tx.assignment.createMany({
          data: assignmentsToCreate.map((a) => ({ ...a, createdAt: appliedAt })),
        });
      }

      // Update plan status with the same timestamp
      if (planId) {
        await tx.weeklyPlan.update({
          where: { id: planId, householdId: member.householdId },
          data: { status: "APPLIED", appliedAt },
        });
      }

      return { cancelledCount: cancelled.count };
    });

    // Notify all household members that a new plan was applied
    await createNotificationForMembers(
      members.map((m) => m.id),
      {
        type: "PLAN_APPLIED",
        title: "Nuevo plan aplicado",
        message: `Se aplicó un plan con ${assignmentsToCreate.length} tareas asignadas`,
        actionUrl: "/my-tasks",
      }
    );

    // Email summary to adults
    const adultMembers = await prisma.member.findMany({
      where: { householdId: member.householdId, isActive: true, memberType: "ADULT" },
      select: { user: { select: { email: true } } },
    });

    const adultEmails = adultMembers
      .filter((m) => m.user.email)
      .map((m) => ({ email: m.user.email }));

    await sendPlanAppliedToAdults(adultEmails, {
      householdName: member.household.name,
      assignmentsCount: assignmentsToCreate.length,
      assignments: assignmentsToCreate.map((a) => {
        const taskName = tasks.find((t) => t.id === a.taskId)?.name ?? "";
        const memberName = members.find((m) => m.id === a.memberId)?.name ?? "";
        return { taskName, memberName };
      }),
      appliedByMemberName: member.name,
    });

    return NextResponse.json({
      success: true,
      assignmentsCreated: assignmentsToCreate.length,
      assignmentsCancelled: result.cancelledCount,
      skipped: skipped.length > 0 ? skipped : undefined,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/apply-plan", method: "POST" });
  }
}
