import { prisma } from "./prisma";
import { computeDueDateForFrequency } from "./due-date";
import { loadTaskPlannerSnapshot } from "./task-planner-context";
import { scoreCandidates } from "@habita/domain";

import type { TaskFrequency } from "@prisma/client";
import type { PlannerTask, TaskPlannerSnapshot } from "@habita/domain";

interface MemberScore {
  memberId: string;
  memberName: string;
  score: number;
  reasons: string[];
}

interface CalculateOptions {
  onlyAdults?: boolean;
}

/**
 * Smart assignment algorithm (spec §2). Delegates scoring to the deterministic
 * engine in @habita/domain; this module only loads/shapes Prisma data.
 */
export async function calculateAssignmentScores(
  householdId: string,
  taskId: string,
  forDate?: Date,
  options?: CalculateOptions
): Promise<MemberScore[]> {
  const targetDate = forDate ?? new Date();
  const now = new Date();

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new Error("Task not found");
  }

  const snapshot = await loadTaskPlannerSnapshot(householdId);
  const plannerTask: PlannerTask = task;

  const candidates = options?.onlyAdults
    ? { ...snapshot, members: snapshot.members.filter((m) => m.memberType === "ADULT") }
    : snapshot;

  return scoreCandidates(plannerTask, targetDate, candidates, now);
}

interface BestAssigneeResult {
  best: MemberScore | null;
  scores: MemberScore[];
}

/**
 * Get the best member to assign a task to, along with all scores.
 * Spec: si tras filtrar por edad no queda nadie, usar solo adultos.
 */
export async function getBestAssignee(
  householdId: string,
  taskId: string,
  forDate?: Date
): Promise<BestAssigneeResult> {
  let scores = await calculateAssignmentScores(householdId, taskId, forDate);
  if (scores.length === 0) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { minAge: true },
    });
    if (task?.minAge != null) {
      scores = await calculateAssignmentScores(householdId, taskId, forDate, {
        onlyAdults: true,
      });
    }
  }
  return { best: scores[0] ?? null, scores };
}

/**
 * Auto-assign a task to the best available member.
 */
export async function autoAssignTask(
  householdId: string,
  taskId: string,
  dueDate: Date
) {
  const { best, scores } = await getBestAssignee(householdId, taskId, dueDate);

  if (!best) {
    throw new Error("No eligible members for this task");
  }

  const assignment = await prisma.assignment.create({
    data: {
      taskId,
      memberId: best.memberId,
      householdId,
      dueDate,
    },
    include: {
      task: { select: { id: true, name: true, weight: true } },
      member: { select: { id: true, name: true } },
    },
  });

  return {
    assignment,
    scores,
    selectedMember: best,
  };
}

/**
 * Auto-assign ALL active tasks in a household using the deterministic engine.
 * Skips tasks that already have pending assignments.
 */
export async function autoAssignAllTasks(householdId: string): Promise<{
  success: boolean;
  assignmentsCreated: number;
  details: Array<{ taskName: string; memberName: string }>;
}> {
  const allTasks = await prisma.task.findMany({
    where: { householdId, isActive: true },
    select: { id: true, name: true, frequency: true },
  });

  const existingAssignments = await prisma.assignment.findMany({
    where: {
      taskId: { in: allTasks.map((t) => t.id) },
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    select: { taskId: true },
  });
  const assignedTaskIds = new Set(existingAssignments.map((a) => a.taskId));

  const tasksToAssign = allTasks.filter((t) => !assignedTaskIds.has(t.id));
  if (tasksToAssign.length === 0) {
    return { success: true, assignmentsCreated: 0, details: [] };
  }

  const now = new Date();
  const snapshot = await loadTaskPlannerSnapshot(householdId);

  const picks = pickAssigneesForBatch(snapshot, tasksToAssign, now);

  if (picks.length > 0) {
    try {
      await prisma.assignment.createMany({
        data: picks.map((p) => ({
          taskId: p.taskId,
          memberId: p.memberId,
          householdId,
          dueDate: p.dueDate,
        })),
      });
    } catch (error) {
      console.error("Failed to batch create assignments:", { householdId, taskCount: picks.length, error });
      return { success: false, assignmentsCreated: 0, details: [] };
    }
  }

  return {
    success: true,
    assignmentsCreated: picks.length,
    details: picks.map((p) => ({ taskName: p.taskName, memberName: p.memberName })),
  };
}

interface BatchAssignmentPick {
  taskId: string;
  taskName: string;
  memberId: string;
  memberName: string;
  dueDate: Date;
}

/**
 * Pick the best assignee for each task from a pre-loaded snapshot, accumulating
 * each chosen member's pending load in-memory (never mutating the snapshot) so
 * later tasks in the same batch see an accurate load penalty.
 */
export function pickAssigneesForBatch(
  snapshot: TaskPlannerSnapshot,
  tasks: Array<{ id: string; name: string; frequency: string }>,
  now: Date,
): BatchAssignmentPick[] {
  const picks: BatchAssignmentPick[] = [];
  const loadOverrides = new Map<string, number>();

  for (const task of tasks) {
    const plannerTask = snapshot.tasks.find((t) => t.id === task.id);
    if (!plannerTask) continue;

    let scores = scoreCandidates(plannerTask, now, snapshot, now, undefined, loadOverrides);
    if (scores.length === 0 && plannerTask.minAge !== null) {
      scores = scoreCandidates(plannerTask, now, snapshot, now, { onlyAdults: true }, loadOverrides);
    }
    const best = scores[0];

    if (!best) continue;

    const dueDate = computeDueDateForFrequency(task.frequency as TaskFrequency, now);
    picks.push({ taskId: task.id, taskName: task.name, memberId: best.memberId, memberName: best.memberName, dueDate });

    loadOverrides.set(best.memberId, (loadOverrides.get(best.memberId) ?? 0) + 1);
  }

  return picks;
}
