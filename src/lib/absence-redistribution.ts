import { prisma } from "./prisma";
import { getBestAssignee } from "./assignment-algorithm";
import type { AbsencePolicy } from "@prisma/client";

/**
 * Redistribuye o pospone asignaciones de miembros en ausencia activa.
 * Políticas: AUTO (reasignar a otro), SPECIFIC (reasignar a assignToMemberId), POSTPONE (posponer al día siguiente al fin).
 */
export async function processAbsenceRedistribution(): Promise<{
  processedAbsences: number;
  reassigned: number;
  postponed: number;
  errors: string[];
}> {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const errors: string[] = [];
  let reassigned = 0;
  let postponed = 0;

  const activeAbsences = await prisma.memberAbsence.findMany({
    where: {
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: {
      member: { select: { id: true, householdId: true } },
    },
  });

  // Cache other members per household+absence to avoid repeated queries
  const otherMembersCache = new Map<string, Array<{ id: string }>>();

  for (const absence of activeAbsences) {
    const start = new Date(absence.startDate);
    const end = new Date(absence.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const pendingAssignments = await prisma.assignment.findMany({
      where: {
        memberId: absence.memberId,
        status: "PENDING",
        dueDate: { gte: start, lte: end },
      },
      include: { task: true },
    });

    for (const assignment of pendingAssignments) {
      try {
        const policy = (absence.policy ?? "AUTO") as AbsencePolicy;

        if (policy === "POSTPONE") {
          const dayAfterEnd = new Date(absence.endDate);
          dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
          dayAfterEnd.setHours(23, 59, 59, 999);

          await prisma.assignment.update({
            where: { id: assignment.id },
            data: { dueDate: dayAfterEnd },
          });
          postponed++;
          continue;
        }

        if (policy === "SPECIFIC" && absence.assignToMemberId) {
          await prisma.assignment.update({
            where: { id: assignment.id },
            data: { memberId: absence.assignToMemberId },
          });
          reassigned++;
          continue;
        }

        if (policy === "AUTO") {
          const cacheKey = `${absence.member.householdId}:${absence.memberId}`;
          let otherMembers = otherMembersCache.get(cacheKey);
          if (!otherMembers) {
            otherMembers = await prisma.member.findMany({
              where: {
                householdId: absence.member.householdId,
                isActive: true,
                id: { not: absence.memberId },
              },
              select: { id: true },
            });
            otherMembersCache.set(cacheKey, otherMembers);
          }

          if (otherMembers.length === 0) {
            errors.push(
              `No hay otro miembro para reasignar asignación ${assignment.id}`
            );
            continue;
          }

          const { best } = await getBestAssignee(
            absence.member.householdId,
            assignment.taskId,
            assignment.dueDate
          );

          if (best && best.memberId !== absence.memberId) {
            await prisma.assignment.update({
              where: { id: assignment.id },
              data: { memberId: best.memberId },
            });
            reassigned++;
          } else {
            const randomIndex = Math.floor(
              Math.random() * otherMembers.length
            );
            const target = otherMembers[randomIndex];
            if (target) {
              await prisma.assignment.update({
                where: { id: assignment.id },
                data: { memberId: target.id },
              });
              reassigned++;
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Assignment ${assignment.id}: ${message}`);
      }
    }
  }

  return {
    processedAbsences: activeAbsences.length,
    reassigned,
    postponed,
    errors,
  };
}
