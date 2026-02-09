import { prisma } from "./prisma";
import { PenaltyReason } from "@prisma/client";
import { createNotification } from "./notification-service";

const POINTS_BY_REASON: Record<PenaltyReason, number> = {
  OVERDUE_24H: 1,
  OVERDUE_48H: 2,
  OVERDUE_72H: 3,
  TRANSFER_FAILED: 0,
};

const HOURS_THRESHOLDS: { hours: number; reason: PenaltyReason }[] = [
  { hours: 72, reason: "OVERDUE_72H" },
  { hours: 48, reason: "OVERDUE_48H" },
  { hours: 24, reason: "OVERDUE_24H" },
];

/**
 * Aplica penalidades por atraso (24h, 48h, 72h) a asignaciones vencidas.
 * Solo aplica cada umbral una vez por asignación (comprueba si ya existe Penalty con ese assignmentId y reason).
 */
export async function applyOverduePenalties(): Promise<{
  processed: number;
  penaltiesCreated: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let penaltiesCreated = 0;

  const overdueAssignments = await prisma.assignment.findMany({
    where: {
      status: "PENDING",
      dueDate: { lt: now },
    },
    include: {
      task: { select: { name: true } },
      member: {
        select: { id: true },
        include: { level: true },
      },
    },
  });

  // Pre-fetch all existing penalties for these assignments in 1 query
  const assignmentIds = overdueAssignments.map((a) => a.id);
  const existingPenalties = assignmentIds.length > 0
    ? await prisma.penalty.findMany({
        where: { assignmentId: { in: assignmentIds } },
        select: { assignmentId: true, reason: true },
      })
    : [];
  const penaltySet = new Set(existingPenalties.map((p) => `${p.assignmentId}:${p.reason}`));

  // Accumulate penalties to create in batch
  const penaltiesToCreate: Array<{
    memberId: string;
    assignmentId: string;
    reason: PenaltyReason;
    points: number;
    description: string;
  }> = [];
  const xpDeductions: Array<{ levelId: string; currentXp: number; deduction: number }> = [];

  for (const assignment of overdueAssignments) {
    try {
      const hoursOverdue =
        (now.getTime() - new Date(assignment.dueDate).getTime()) /
        (1000 * 60 * 60);

      for (const { hours, reason } of HOURS_THRESHOLDS) {
        if (hoursOverdue < hours) continue;
        if (penaltySet.has(`${assignment.id}:${reason}`)) continue;

        const points = POINTS_BY_REASON[reason];
        penaltiesToCreate.push({
          memberId: assignment.memberId,
          assignmentId: assignment.id,
          reason,
          points,
          description: `Atraso ≥${hours}h`,
        });
        penaltySet.add(`${assignment.id}:${reason}`);
        penaltiesCreated++;

        if (points > 0 && assignment.member.level) {
          xpDeductions.push({
            levelId: assignment.member.level.id,
            currentXp: assignment.member.level.xp ?? 0,
            deduction: points,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Assignment ${assignment.id}: ${message}`);
    }
  }

  // Batch create all penalties
  if (penaltiesToCreate.length > 0) {
    await prisma.penalty.createMany({ data: penaltiesToCreate });

    // Create a notification for each penalty
    // Build a map of assignmentId -> task name for messages
    const taskNameMap = new Map(overdueAssignments.map((a) => [a.id, a.task.name]));

    for (const penalty of penaltiesToCreate) {
      const taskName = taskNameMap.get(penalty.assignmentId) ?? "tarea";
      await createNotification({
        memberId: penalty.memberId,
        type: "PENALTY_APPLIED",
        title: "Penalidad aplicada",
        message: `-${penalty.points} XP por atraso en "${taskName}"`,
        actionUrl: "/my-tasks",
      });
    }
  }

  // Apply XP deductions individually (different values per member)
  for (const { levelId, currentXp, deduction } of xpDeductions) {
    try {
      await prisma.memberLevel.update({
        where: { id: levelId },
        data: { xp: Math.max(0, currentXp - deduction) },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`XP deduction for level ${levelId}: ${message}`);
    }
  }

  return {
    processed: overdueAssignments.length,
    penaltiesCreated,
    errors,
  };
}
