import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { loadTaskPlannerSnapshot } from "@/lib/task-planner-context";
import { scoreCandidates } from "@habita/domain";
import { deliverNotificationToMembers } from "@/lib/push-delivery";
import { APP_ROUTES } from "@habita/contracts";

import type { TaskPlannerSnapshot } from "@habita/domain";

interface PendingAssignment {
  id: string;
  taskId: string;
  dueDate: Date;
}

interface ReassignmentPick {
  assignmentId: string;
  memberId: string;
}

interface ReassignmentPlan {
  reassigned: ReassignmentPick[];
  cancelledIds: string[];
}

/**
 * Picks a replacement for each pending assignment using the same scoring
 * engine as the weekly planner (mirrors pickAssigneesForBatch in
 * assignment-algorithm.ts), accumulating in-memory load so later picks in
 * this batch reflect earlier ones. `snapshot` must already exclude the
 * leaving member. Falls back to cancelling an assignment only when no
 * eligible member exists — shouldn't happen once the last-ADULT guard holds,
 * but keeps the data consistent if it ever does.
 */
function planReassignments(
  snapshot: TaskPlannerSnapshot,
  assignments: PendingAssignment[],
  now: Date,
): ReassignmentPlan {
  const reassigned: ReassignmentPick[] = [];
  const cancelledIds: string[] = [];
  const loadOverrides = new Map<string, number>();

  for (const assignment of assignments) {
    const task = snapshot.tasks.find((t) => t.id === assignment.taskId);
    if (!task) {
      cancelledIds.push(assignment.id);
      continue;
    }

    let scores = scoreCandidates(task, assignment.dueDate, snapshot, now, undefined, loadOverrides);
    if (scores.length === 0 && task.minAge !== null) {
      scores = scoreCandidates(task, assignment.dueDate, snapshot, now, { onlyAdults: true }, loadOverrides);
    }
    const best = scores[0];

    if (!best) {
      cancelledIds.push(assignment.id);
      continue;
    }

    reassigned.push({ assignmentId: assignment.id, memberId: best.memberId });
    loadOverrides.set(best.memberId, (loadOverrides.get(best.memberId) ?? 0) + 1);
  }

  return { reassigned, cancelledIds };
}

/**
 * POST /api/members/me/leave
 * Deactivates the current member after reassigning their pending work to
 * other active members and cancelling their pending transfers.
 *
 * Blocked only when the leaver is an ADULT, is the last active ADULT, AND
 * other active (non-ADULT) members would remain — a lone active member
 * (any memberType) may always leave, emptying the household. The guard is
 * re-checked inside the transaction (Serializable) right before the writes
 * to close the race between two concurrent leave requests; a Prisma
 * serialization failure (P2034) is surfaced as a retryable 409.
 */
export async function POST() {
  try {
    const member = await requireMember();

    const pendingAssignments = await prisma.assignment.findMany({
      where: {
        memberId: member.id,
        householdId: member.householdId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      select: { id: true, taskId: true, dueDate: true },
    });

    let plan: ReassignmentPlan = { reassigned: [], cancelledIds: [] };
    if (pendingAssignments.length > 0) {
      const snapshot = await loadTaskPlannerSnapshot(member.householdId);
      const othersSnapshot: TaskPlannerSnapshot = {
        ...snapshot,
        members: snapshot.members.filter((m) => m.id !== member.id),
      };
      plan = planReassignments(othersSnapshot, pendingAssignments, new Date());
    }

    await prisma.$transaction(
      async (tx) => {
        if (member.memberType === "ADULT") {
          const [activeAdultCount, totalActiveCount] = await Promise.all([
            tx.member.count({
              where: { householdId: member.householdId, isActive: true, memberType: "ADULT" },
            }),
            tx.member.count({
              where: { householdId: member.householdId, isActive: true },
            }),
          ]);
          if (activeAdultCount <= 1 && totalActiveCount > 1) {
            throw new AppError(
              "Sos el único adulto activo del hogar, todavía no podés salir",
              409,
              "LAST_ADULT",
            );
          }
        }

        for (const pick of plan.reassigned) {
          await tx.assignment.update({ where: { id: pick.assignmentId }, data: { memberId: pick.memberId } });
        }
        if (plan.cancelledIds.length > 0) {
          await tx.assignment.updateMany({
            where: { id: { in: plan.cancelledIds } },
            data: { status: "CANCELLED" },
          });
        }

        await tx.taskTransfer.updateMany({
          where: {
            status: "PENDING",
            OR: [{ fromMemberId: member.id }, { toMemberId: member.id }],
          },
          data: { status: "REJECTED", respondedAt: new Date() },
        });

        await tx.member.update({ where: { id: member.id }, data: { isActive: false } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const [remainingMembers, otherHouseholdMember] = await Promise.all([
      prisma.member.findMany({
        where: { householdId: member.householdId, isActive: true },
        select: { id: true },
      }),
      prisma.member.findFirst({
        where: { userId: member.userId, isActive: true, householdId: { not: member.householdId } },
        orderBy: { createdAt: "asc" },
        select: { householdId: true },
      }),
    ]);

    if (remainingMembers.length > 0) {
      void deliverNotificationToMembers({
        memberIds: remainingMembers.map((m) => m.id),
        type: "MEMBER_LEFT",
        title: "Un miembro salió del hogar",
        message: `${member.name} salió de "${member.household.name}"`,
        actionUrl: APP_ROUTES.perfil,
        householdTimezone: member.household.timezone,
      });
    }

    return NextResponse.json({ nextHouseholdId: otherHouseholdMember?.householdId ?? null });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json(
        { error: "Hubo un conflicto al procesar la salida, intentá de nuevo", code: "LEAVE_CONFLICT" },
        { status: 409 },
      );
    }
    return handleApiError(error, { route: "/api/members/me/leave", method: "POST" });
  }
}
