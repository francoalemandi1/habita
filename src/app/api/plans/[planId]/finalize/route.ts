import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { calculatePointsWithBreakdown } from "@/lib/points";
import { checkAndUnlockAchievements } from "@/lib/achievements";
import { calculatePlanPerformance, generateAIRewards } from "@/lib/llm/ai-reward-generator";
import { z } from "zod";

import type { NextRequest } from "next/server";
import type { TaskFrequency } from "@prisma/client";

interface RouteParams {
  params: Promise<{ planId: string }>;
}

const finalizeSchema = z.object({
  assignmentIds: z.array(z.string().min(1)).max(500),
});

/**
 * POST /api/plans/[planId]/finalize
 * Finalize a plan: complete selected assignments, cancel the rest, generate rewards.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { planId } = await params;

    const body: unknown = await request.json();
    const validation = finalizeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { assignmentIds } = validation.data;

    // Verify plan exists, belongs to household, and is APPLIED
    const plan = await prisma.weeklyPlan.findFirst({
      where: {
        id: planId,
        householdId: member.householdId,
        status: "APPLIED",
      },
      select: { id: true, createdAt: true, expiresAt: true, appliedAt: true },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan no encontrado o no está activo" },
        { status: 404 }
      );
    }

    const now = new Date();
    const planStartDate = plan.appliedAt ?? plan.createdAt;

    // Fetch assignments to complete (only PENDING/IN_PROGRESS from this plan period)
    const assignmentsToComplete = assignmentIds.length > 0
      ? await prisma.assignment.findMany({
          where: {
            id: { in: assignmentIds },
            householdId: member.householdId,
            status: { in: ["PENDING", "IN_PROGRESS"] },
            createdAt: { gte: planStartDate },
          },
          include: {
            task: {
              select: { id: true, name: true, weight: true, frequency: true },
            },
            member: {
              include: { level: true },
            },
          },
        })
      : [];

    const uniqueMemberIds = [...new Set(assignmentsToComplete.map((a) => a.memberId))];

    // Transaction: complete assignments, cancel remaining, update XP, finalize plan
    const result = await prisma.$transaction(async (tx) => {
      let totalCompleted = 0;
      const xpByMember = new Map<string, number>();

      // Complete each selected assignment
      for (const assignment of assignmentsToComplete) {
        const breakdown = calculatePointsWithBreakdown({
          weight: assignment.task.weight,
          frequency: assignment.task.frequency as TaskFrequency,
        });

        const updated = await tx.assignment.updateMany({
          where: {
            id: assignment.id,
            status: { in: ["PENDING", "IN_PROGRESS"] },
          },
          data: {
            status: "COMPLETED",
            completedAt: now,
            pointsEarned: breakdown.total,
          },
        });

        if (updated.count > 0) {
          totalCompleted++;
          const currentXp = xpByMember.get(assignment.memberId) ?? 0;
          xpByMember.set(assignment.memberId, currentXp + breakdown.total);
        }
      }

      // Cancel remaining PENDING/IN_PROGRESS assignments from the plan period
      const cancelled = await tx.assignment.updateMany({
        where: {
          householdId: member.householdId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          createdAt: { gte: planStartDate },
        },
        data: { status: "CANCELLED" },
      });

      // Update XP for each member who earned points
      for (const [memberId, earnedXp] of xpByMember) {
        const memberData = assignmentsToComplete.find((a) => a.memberId === memberId);
        const currentLevel = memberData?.member.level;
        const newXp = (currentLevel?.xp ?? 0) + earnedXp;
        const newLevel = Math.floor(newXp / 100) + 1;

        if (currentLevel) {
          await tx.memberLevel.update({
            where: { id: currentLevel.id },
            data: { xp: newXp, level: newLevel },
          });
        } else {
          await tx.memberLevel.create({
            data: { memberId, xp: newXp, level: newLevel },
          });
        }
      }

      // Mark plan as COMPLETED
      await tx.weeklyPlan.update({
        where: { id: planId },
        data: { status: "COMPLETED" },
      });

      return { totalCompleted, cancelledCount: cancelled.count };
    });

    // Best-effort: generate rewards
    let rewardsGenerated = false;
    try {
      const performances = await calculatePlanPerformance(
        member.householdId,
        plan.createdAt,
        plan.expiresAt,
      );
      const rewardResult = await generateAIRewards(member.householdId, planId, performances);

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
              planId,
              memberId: perf.memberId,
              completionRate: perf.completionRate,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        if (rewardsToCreate.length > 0) {
          await prisma.householdReward.createMany({ data: rewardsToCreate });
          rewardsGenerated = true;
        }
      }
    } catch (err) {
      console.error("Error generating rewards on plan finalize (non-blocking):", err);
    }

    // Best-effort: check achievements for each member
    try {
      await Promise.all(
        uniqueMemberIds.map((memberId) => checkAndUnlockAchievements(memberId))
      );
    } catch (err) {
      console.error("Error checking achievements on plan finalize (non-blocking):", err);
    }

    return NextResponse.json({
      success: true,
      completed: result.totalCompleted,
      cancelled: result.cancelledCount,
      rewardsGenerated,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/plans/[planId]/finalize", method: "POST" });
  }
}
