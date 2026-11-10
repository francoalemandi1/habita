import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { computeDueDateForFrequency } from "./due-date";
import { loadTaskPlannerSnapshot } from "./task-planner-context";
import { pickNextAssignee, pickNextRotationAssignee } from "@habita/domain";
import { createNotificationForMembers } from "./notification-service";

import type { Assignment } from "@prisma/client";

const assignmentInclude = {
  task: {
    select: {
      id: true,
      name: true,
      weight: true,
      frequency: true,
    },
  },
  member: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

type AssignmentWithTaskAndMember = NonNullable<Awaited<ReturnType<typeof findAssignment>>>;

async function findAssignment(assignmentId: string, householdId: string) {
  return prisma.assignment.findFirst({
    where: { id: assignmentId, householdId },
    include: assignmentInclude,
  });
}

const completedAssignmentInclude = {
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
  completedByMember: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

interface CompletedByResult {
  assignment: Prisma.AssignmentGetPayload<{ include: typeof completedAssignmentInclude }>;
}

export interface CompleteAssignmentParams {
  householdId: string;
  assignmentId: string;
  member: { id: string; name: string };
  notes?: string;
}

export type CompleteAssignmentResult =
  | { kind: "not_found" }
  | { kind: "already_completed" }
  | { kind: "cancelled" }
  | {
      kind: "completed";
      assignment: CompletedByResult["assignment"];
      completedBy: { id: string; name: string } | undefined;
      planFinalized: boolean;
      finalizedPlanId: string | undefined;
      nextAssignment: { id: string; memberId: string; dueDate: Date } | undefined;
      warnings: { nextAssignmentCreated: boolean };
    };

export async function completeAssignment(params: CompleteAssignmentParams): Promise<CompleteAssignmentResult> {
  const { householdId, assignmentId, member, notes } = params;

  const assignment = await findAssignment(assignmentId, householdId);
  if (!assignment) return { kind: "not_found" };

  if (assignment.status === "COMPLETED" || assignment.status === "VERIFIED") {
    return { kind: "already_completed" };
  }

  if (assignment.status === "CANCELLED") {
    return { kind: "cancelled" };
  }

  const now = new Date();

  const result = await runCompletionTransaction({ assignmentId, householdId, memberId: member.id, notes, assignment, now });
  if (result === null) return { kind: "already_completed" };

  await notifyOtherAssignee({ assignment, completedById: member.id, completedByName: member.name });

  const { nextAssignment, nextAssignmentError } = await createNextAssignment(assignment, now);
  const { planFinalized, finalizedPlanId } = await autoFinalizePlan(householdId);

  return {
    kind: "completed",
    assignment: result.assignment,
    completedBy: result.assignment.completedByMember
      ? { id: result.assignment.completedByMember.id, name: result.assignment.completedByMember.name }
      : undefined,
    planFinalized,
    finalizedPlanId: planFinalized ? finalizedPlanId : undefined,
    nextAssignment: nextAssignment
      ? { id: nextAssignment.id, memberId: nextAssignment.memberId, dueDate: nextAssignment.dueDate }
      : undefined,
    warnings: { nextAssignmentCreated: !nextAssignmentError },
  };
}

async function runCompletionTransaction(params: {
  assignmentId: string;
  householdId: string;
  memberId: string;
  notes: string | undefined;
  assignment: AssignmentWithTaskAndMember;
  now: Date;
}): Promise<CompletedByResult | null> {
  const { assignmentId, householdId, memberId, notes, assignment, now } = params;

  return prisma.$transaction(async (tx) => {
    // Atomic status guard: only complete if still PENDING/IN_PROGRESS
    const updated = await tx.assignment.updateMany({
      where: {
        id: assignmentId,
        householdId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      data: {
        status: "COMPLETED",
        completedAt: now,
        completedByMemberId: memberId,
        notes: notes ?? assignment?.notes,
      },
    });

    if (updated.count === 0) return null;

    const updatedAssignment = await tx.assignment.findUniqueOrThrow({
      where: { id: assignmentId },
      include: completedAssignmentInclude,
    });

    return { assignment: updatedAssignment };
  });
}

async function notifyOtherAssignee(params: {
  assignment: AssignmentWithTaskAndMember;
  completedById: string;
  completedByName: string;
}): Promise<void> {
  const { assignment, completedById, completedByName } = params;

  // Spec: when someone other than the assignee completes the task, let them know.
  if (completedById !== assignment.memberId) {
    await createNotificationForMembers([assignment.memberId], {
      type: "TASK_COMPLETED_BY_OTHER",
      title: "Tarea completada",
      message: `${completedByName} hizo ${assignment.task.name} por vos`,
      actionUrl: "/casa",
    });
  }
}

async function createNextAssignment(
  assignment: AssignmentWithTaskAndMember,
  now: Date,
): Promise<{ nextAssignment: Assignment | null; nextAssignmentError: boolean }> {
  if (assignment.task.frequency === "ONCE") {
    return { nextAssignment: null, nextAssignmentError: false };
  }

  try {
    const nextDue = computeDueDateForFrequency(assignment.task.frequency, now);
    const snapshot = await loadTaskPlannerSnapshot(assignment.householdId);
    const plannerTask = snapshot.tasks.find((t) => t.id === assignment.taskId);
    const rotationPick =
      plannerTask?.isRotating === true
        ? pickNextRotationAssignee(plannerTask, assignment.memberId, nextDue, snapshot)
        : null;
    const best = plannerTask ? (rotationPick ?? pickNextAssignee(plannerTask, nextDue, snapshot, now)) : null;

    if (!best) return { nextAssignment: null, nextAssignmentError: false };

    const nextAssignment = await prisma.assignment.create({
      data: {
        taskId: assignment.taskId,
        memberId: best.memberId,
        householdId: assignment.householdId,
        dueDate: nextDue,
        status: "PENDING",
      },
    });
    return { nextAssignment, nextAssignmentError: false };
  } catch (err) {
    console.error("Error creating next assignment:", err);
    return { nextAssignment: null, nextAssignmentError: true };
  }
}

async function autoFinalizePlan(householdId: string): Promise<{ planFinalized: boolean; finalizedPlanId: string | undefined }> {
  try {
    const activePlan = await prisma.weeklyPlan.findFirst({
      where: { householdId, status: "APPLIED" },
      select: { id: true, createdAt: true, expiresAt: true, appliedAt: true },
    });

    if (!activePlan) return { planFinalized: false, finalizedPlanId: undefined };

    const planStartDate = activePlan.appliedAt ?? activePlan.createdAt;
    const remainingCount = await prisma.assignment.count({
      where: {
        householdId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        createdAt: { gte: planStartDate },
      },
    });

    if (remainingCount !== 0) return { planFinalized: false, finalizedPlanId: undefined };

    await prisma.weeklyPlan.update({
      where: { id: activePlan.id },
      data: { status: "COMPLETED" },
    });

    // Notify all members that the plan was completed
    const householdMemberIds = await prisma.member.findMany({
      where: { householdId, isActive: true },
      select: { id: true },
    });
    await createNotificationForMembers(
      householdMemberIds.map((m) => m.id),
      {
        type: "PLAN_APPLIED",
        title: "Plan completado",
        message: "Todas las tareas del plan fueron completadas",
        actionUrl: "/plan",
      },
    );

    return { planFinalized: true, finalizedPlanId: activePlan.id };
  } catch (err) {
    console.error("Error auto-finalizing plan (non-blocking):", err);
    return { planFinalized: false, finalizedPlanId: undefined };
  }
}
