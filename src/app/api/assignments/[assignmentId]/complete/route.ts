import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { completeAssignmentSchema } from "@/lib/validations/assignment";
import { calculatePointsWithBreakdown } from "@/lib/points";
import { checkAndUnlockAchievements } from "@/lib/achievements";
import { getBestAssignee } from "@/lib/assignment-algorithm";
import { computeDueDateForFrequency } from "@/lib/due-date";
import { calculatePlanPerformance, generateAIRewards } from "@/lib/llm/ai-reward-generator";
import { createNotification, createNotificationForMembers } from "@/lib/notification-service";

import type { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ assignmentId: string }>;
}

/**
 * POST /api/assignments/[assignmentId]/complete
 * Mark an assignment as completed and award points
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { assignmentId } = await params;
    const body: unknown = await request.json();

    const validation = completeAssignmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    // Get assignment with task details
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        householdId: member.householdId,
      },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            weight: true,
            frequency: true,
          },
        },
        member: {
          include: {
            level: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
    }

    if (assignment.status === "COMPLETED" || assignment.status === "VERIFIED") {
      return NextResponse.json({ error: "La tarea ya fue completada" }, { status: 400 });
    }

    if (assignment.status === "CANCELLED") {
      return NextResponse.json({ error: "La tarea fue cancelada" }, { status: 400 });
    }

    // Calculate points
    const now = new Date();
    const pointsBreakdown = calculatePointsWithBreakdown({
      weight: assignment.task.weight,
      frequency: assignment.task.frequency,
    });
    const points = pointsBreakdown.total;

    // Update assignment and member level in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Atomic status guard: only complete if still PENDING/IN_PROGRESS
      const updated = await tx.assignment.updateMany({
        where: {
          id: assignmentId,
          householdId: member.householdId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
        data: {
          status: "COMPLETED",
          completedAt: now,
          pointsEarned: points,
          notes: validation.data.notes ?? assignment.notes,
        },
      });

      if (updated.count === 0) {
        throw new Error("ALREADY_COMPLETED");
      }

      // Re-fetch for response
      const updatedAssignment = await tx.assignment.findUniqueOrThrow({
        where: { id: assignmentId },
        include: {
          task: {
            select: {
              id: true,
              name: true,
              weight: true,
            },
          },
          member: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Update or create member level
      const currentLevel = assignment.member.level;
      const newXp = (currentLevel?.xp ?? 0) + points;
      const newLevel = Math.floor(newXp / 100) + 1;

      if (currentLevel) {
        await tx.memberLevel.update({
          where: { id: currentLevel.id },
          data: {
            xp: newXp,
            level: newLevel,
          },
        });
      } else {
        await tx.memberLevel.create({
          data: {
            memberId: assignment.memberId,
            xp: newXp,
            level: newLevel,
          },
        });
      }

      return {
        assignment: updatedAssignment,
        pointsEarned: points,
        newXp,
        newLevel,
        leveledUp: currentLevel ? newLevel > currentLevel.level : newLevel > 1,
      };
    });

    // Notify level-up
    if (result.leveledUp) {
      await createNotification({
        memberId: assignment.memberId,
        type: "LEVEL_UP",
        title: "Subiste de nivel",
        message: `Alcanzaste el nivel ${result.newLevel}`,
        actionUrl: "/profile",
      });
    }

    // Check for new achievements (after transaction)
    const newAchievements = await checkAndUnlockAchievements(
      assignment.memberId,
      { ...assignment, completedAt: now }
    );

    // Notify each new achievement
    for (const achievement of newAchievements) {
      await createNotification({
        memberId: assignment.memberId,
        type: "ACHIEVEMENT_UNLOCKED",
        title: "Logro desbloqueado",
        message: `${achievement.name} (+${achievement.xpReward} XP)`,
        actionUrl: "/achievements",
      });
    }

    // Update competition score if there's an active competition
    let competitionScoreUpdated = true;
    try {
      const activeCompetition = await prisma.competition.findFirst({
        where: {
          householdId: member.householdId,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (activeCompetition) {
        await prisma.competitionScore.upsert({
          where: {
            competitionId_memberId: {
              competitionId: activeCompetition.id,
              memberId: assignment.memberId,
            },
          },
          update: {
            points: { increment: points },
            tasksCompleted: { increment: 1 },
          },
          create: {
            competitionId: activeCompetition.id,
            memberId: assignment.memberId,
            points,
            tasksCompleted: 1,
          },
        });
      }
    } catch (err) {
      competitionScoreUpdated = false;
      console.error("Error updating competition score:", err);
    }

    // Spec §2.1: al completar, crear siguiente instancia y asignar
    let nextAssignment = null;
    let nextAssignmentError = false;
    if (assignment.task.frequency !== "ONCE") {
      try {
        const nextDue = computeDueDateForFrequency(
          assignment.task.frequency,
          now
        );
        const { best } = await getBestAssignee(
          assignment.householdId,
          assignment.taskId,
          nextDue
        );
        if (best) {
          nextAssignment = await prisma.assignment.create({
            data: {
              taskId: assignment.taskId,
              memberId: best.memberId,
              householdId: assignment.householdId,
              dueDate: nextDue,
              status: "PENDING",
            },
          });
        }
      } catch (err) {
        nextAssignmentError = true;
        console.error("Error creating next assignment:", err);
      }
    }

    // Auto-finalize plan if all assignments from the plan period are now completed
    let planFinalized = false;
    try {
      const activePlan = await prisma.weeklyPlan.findFirst({
        where: {
          householdId: member.householdId,
          status: "APPLIED",
        },
        select: { id: true, createdAt: true, expiresAt: true, appliedAt: true },
      });

      if (activePlan) {
        const planStartDate = activePlan.appliedAt ?? activePlan.createdAt;
        const remainingCount = await prisma.assignment.count({
          where: {
            householdId: member.householdId,
            status: { in: ["PENDING", "IN_PROGRESS"] },
            createdAt: { gte: planStartDate },
          },
        });

        if (remainingCount === 0) {
          await prisma.weeklyPlan.update({
            where: { id: activePlan.id },
            data: { status: "COMPLETED" },
          });
          planFinalized = true;

          // Notify all members that the plan was completed
          const householdMemberIds = await prisma.member.findMany({
            where: { householdId: member.householdId, isActive: true },
            select: { id: true },
          });
          await createNotificationForMembers(
            householdMemberIds.map((m) => m.id),
            {
              type: "PLAN_APPLIED",
              title: "Plan completado",
              message: "Todas las tareas del plan fueron completadas",
              actionUrl: "/plan",
            }
          );

          // Best-effort: generate rewards for the finalized plan
          try {
            const performances = await calculatePlanPerformance(
              member.householdId,
              activePlan.createdAt,
              activePlan.expiresAt,
            );
            const rewardResult = await generateAIRewards(member.householdId, activePlan.id, performances);
            if (rewardResult && rewardResult.rewards.length > 0) {
              const perfMap = new Map(performances.map((p) => [p.memberName.toLowerCase(), p]));
              const rewardsToCreate = rewardResult.rewards
                .map((r) => {
                  const perf = perfMap.get(r.memberName.toLowerCase());
                  if (!perf) return null;
                  return {
                    householdId: member.householdId,
                    name: r.rewardName,
                    description: r.rewardDescription,
                    pointsCost: r.pointsCost,
                    isAiGenerated: true,
                    planId: activePlan.id,
                    memberId: perf.memberId,
                    completionRate: perf.completionRate,
                  };
                })
                .filter((r): r is NonNullable<typeof r> => r !== null);
              if (rewardsToCreate.length > 0) {
                await prisma.householdReward.createMany({ data: rewardsToCreate });
              }
            }
          } catch (err) {
            console.error("Error generating rewards on auto-finalize (non-blocking):", err);
          }
        }
      }
    } catch (err) {
      console.error("Error auto-finalizing plan (non-blocking):", err);
    }

    return NextResponse.json({
      ...result,
      pointsBreakdown: {
        base: pointsBreakdown.base,
      },
      newAchievements,
      planFinalized,
      nextAssignment: nextAssignment
        ? {
            id: nextAssignment.id,
            memberId: nextAssignment.memberId,
            dueDate: nextAssignment.dueDate,
          }
        : undefined,
      warnings: {
        competitionScoreUpdated,
        nextAssignmentCreated: !nextAssignmentError,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_COMPLETED") {
      return NextResponse.json({ error: "La tarea ya fue completada" }, { status: 400 });
    }

    console.error("POST /api/assignments/[assignmentId]/complete error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error completing assignment" }, { status: 500 });
  }
}
