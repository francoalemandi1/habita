import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { calculatePlanPerformance, generateAIRewards } from "@/lib/llm/ai-reward-generator";
import { createNotificationForMembers } from "@/lib/notification-service";

import type { NextRequest } from "next/server";

interface AssignmentToApply {
  taskName: string;
  memberName: string;
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
        select: { id: true, name: true },
      }),
    ]);

    const memberMap = new Map(members.map((m) => [m.name.toLowerCase(), m.id]));
    const taskMap = new Map(
      tasks.map((t) => [t.name.toLowerCase(), t.id])
    );

    const now = new Date();

    let planEndDate: Date | undefined;
    if (planId) {
      const existingPlan = await prisma.weeklyPlan.findUnique({
        where: { id: planId },
        select: { expiresAt: true },
      });
      if (existingPlan) {
        planEndDate = existingPlan.expiresAt;
      }
    }

    // Build assignments data before transaction
    const assignmentsToCreate: Array<{
      taskId: string;
      memberId: string;
      householdId: string;
      dueDate: Date;
      status: "PENDING";
    }> = [];

    const skipped: string[] = [];

    // Plan-applied tasks are due end-of-today so they're immediately visible in "Mis tareas".
    // When completed, computeDueDateForFrequency creates the next occurrence with the correct
    // future due date (which stays hidden until it's due, preventing the "reappearing task" issue).
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const planDueDate = planEndDate && planEndDate < endOfDay ? planEndDate : endOfDay;

    for (const assignment of assignments) {
      const memberId = memberMap.get(assignment.memberName.toLowerCase());
      const taskId = taskMap.get(assignment.taskName.toLowerCase());

      if (!memberId || !taskId) {
        skipped.push(`${assignment.taskName} → ${assignment.memberName}`);
        continue;
      }

      assignmentsToCreate.push({
        taskId,
        memberId,
        householdId: member.householdId,
        dueDate: planDueDate,
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

      // Cancel pending/in-progress assignments
      const cancelled = await tx.assignment.updateMany({
        where: {
          householdId: member.householdId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
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

    return NextResponse.json({
      success: true,
      assignmentsCreated: assignmentsToCreate.length,
      assignmentsCancelled: result.cancelledCount,
      skipped: skipped.length > 0 ? skipped : undefined,
    });
  } catch (error) {
    console.error("POST /api/ai/apply-plan error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Error applying plan" },
      { status: 500 }
    );
  }
}
