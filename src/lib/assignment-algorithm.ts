import { prisma } from "./prisma";
import { MEMBER_CAPACITY } from "@/types";
import { computeDueDateForFrequency } from "./due-date";

import type { Member, MemberAbsence, MemberPreference, Task, TaskFrequency } from "@prisma/client";

interface MemberScore {
  memberId: string;
  memberName: string;
  score: number;
  reasons: string[];
}

interface MemberWithDetails extends Member {
  preferences: MemberPreference[];
  assignments: { status: string }[];
  absences: MemberAbsence[];
}

/**
 * Check if a member is absent on a given date.
 */
function isAbsentOnDate(absences: MemberAbsence[], date: Date): boolean {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  return absences.some((absence) => {
    const startDate = new Date(absence.startDate);
    const endDate = new Date(absence.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return checkDate >= startDate && checkDate <= endDate;
  });
}

interface CalculateOptions {
  onlyAdults?: boolean;
}

/**
 * Smart assignment algorithm (spec §2).
 *
 * Score factors:
 * 1. Base 100 × capacity (adult 1.0, teen 0.6, child 0.3)
 * 2. Preference: +20 preferred, -20 disliked
 * 3. Load: -5 per pending assignment
 * 4. Recency: min(daysSince, 14) or +14 if never
 * 5. Min age: exclude if task has age requirement (fallback: onlyAdults)
 * 6. Absences: exclude if member is absent on assignment date
 */
export async function calculateAssignmentScores(
  householdId: string,
  taskId: string,
  forDate?: Date,
  options?: CalculateOptions
): Promise<MemberScore[]> {
  const targetDate = forDate ?? new Date();

  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  const members = await prisma.member.findMany({
    where: {
      householdId,
      isActive: true,
      ...(options?.onlyAdults ? { memberType: "ADULT" } : {}),
    },
    include: {
      preferences: {
        where: { taskId },
      },
      assignments: {
        where: {
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
        select: { status: true },
      },
      absences: {
        where: {
          startDate: { lte: targetDate },
          endDate: { gte: targetDate },
        },
      },
    },
  });

  // Get last assignment of this task for each member
  const lastAssignments = await prisma.assignment.groupBy({
    by: ["memberId"],
    where: {
      taskId,
      householdId,
      status: { in: ["COMPLETED", "VERIFIED"] },
    },
    _max: {
      completedAt: true,
    },
  });

  const lastAssignmentMap = new Map(
    lastAssignments.map((a) => [a.memberId, a._max.completedAt])
  );

  const now = new Date();
  const scores: MemberScore[] = [];

  for (const member of members as MemberWithDetails[]) {
    // 6. Absence filter (exclude entirely)
    if (isAbsentOnDate(member.absences, targetDate)) {
      continue; // Skip absent members
    }

    const reasons: string[] = [];
    let score = 100; // Base score (spec: 100)

    // 1. Preference factor: +20 preferred, -20 disliked
    const preference = member.preferences[0];
    if (preference) {
      if (preference.preference === "PREFERRED") {
        score += 20;
        reasons.push("+20 tarea preferida");
      } else if (preference.preference === "DISLIKED") {
        score -= 20;
        reasons.push("-20 tarea no deseada");
      }
    }

    // 2. Current load: -5 per pending assignment
    const pendingCount = member.assignments.length;
    const loadPenalty = pendingCount * 5;
    score -= loadPenalty;
    if (loadPenalty > 0) {
      reasons.push(`-${loadPenalty} por ${pendingCount} tareas pendientes`);
    }

    // 3. Recency: min(daysSince, 14) or 14 if never did this task (spec)
    const lastCompleted = lastAssignmentMap.get(member.id);
    if (lastCompleted) {
      const daysSince = Math.floor(
        (now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24)
      );
      const recencyBonus = Math.min(daysSince, 14);
      score += recencyBonus;
      if (recencyBonus > 0) {
        reasons.push(`+${recencyBonus} por ${daysSince} días sin esta tarea`);
      }
    } else {
      score += 14; // Max benefit for never having done this task (spec)
      reasons.push("+14 nunca ha hecho esta tarea");
    }

    // 4. Capacity factor: adult 1.0, teen 0.6, child 0.3
    const capacity = MEMBER_CAPACITY[member.memberType];
    score = Math.round(score * capacity);
    if (capacity < 1) {
      reasons.push(`×${capacity} capacidad ${member.memberType.toLowerCase()}`);
    }

    // 5. Min age filter (exclude, don't just penalize)
    if (task.minAge !== null) {
      // For now, we assume CHILD < 13, TEEN 13-17, ADULT 18+
      const memberAge =
        member.memberType === "CHILD" ? 10 : member.memberType === "TEEN" ? 15 : 25;
      if (memberAge < task.minAge) {
        continue; // Skip this member entirely
      }
    }

    scores.push({
      memberId: member.id,
      memberName: member.name,
      score,
      reasons,
    });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  return scores;
}

/**
 * Pre-loaded context for batch scoring (eliminates N+1 queries).
 */
interface BatchScoreContext {
  members: MemberWithDetails[];
  /** Map of taskId → Map of memberId → lastCompletedAt */
  lastAssignmentsByTask: Map<string, Map<string, Date | null>>;
  tasks: Task[];
}

/**
 * Pre-load all data needed to score multiple tasks in 3 queries.
 */
async function loadBatchScoreContext(
  householdId: string,
  taskIds: string[],
  targetDate: Date,
): Promise<BatchScoreContext> {
  const [members, tasks, lastAssignments] = await Promise.all([
    prisma.member.findMany({
      where: { householdId, isActive: true },
      include: {
        preferences: { where: { taskId: { in: taskIds } } },
        assignments: {
          where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
          select: { status: true },
        },
        absences: {
          where: { startDate: { lte: targetDate }, endDate: { gte: targetDate } },
        },
      },
    }),
    prisma.task.findMany({
      where: { id: { in: taskIds } },
    }),
    prisma.assignment.groupBy({
      by: ["memberId", "taskId"],
      where: {
        taskId: { in: taskIds },
        householdId,
        status: { in: ["COMPLETED", "VERIFIED"] },
      },
      _max: { completedAt: true },
    }),
  ]);

  // Build nested map: taskId → memberId → lastCompletedAt
  const lastAssignmentsByTask = new Map<string, Map<string, Date | null>>();
  for (const entry of lastAssignments) {
    let taskMap = lastAssignmentsByTask.get(entry.taskId);
    if (!taskMap) {
      taskMap = new Map();
      lastAssignmentsByTask.set(entry.taskId, taskMap);
    }
    taskMap.set(entry.memberId, entry._max.completedAt);
  }

  return { members: members as MemberWithDetails[], lastAssignmentsByTask, tasks };
}

/**
 * Score members for a specific task using pre-loaded context (no DB queries).
 */
function calculateScoresFromContext(
  context: BatchScoreContext,
  taskId: string,
  targetDate: Date,
  options?: CalculateOptions,
): MemberScore[] {
  const task = context.tasks.find((t) => t.id === taskId);
  if (!task) return [];

  const lastAssignmentMap = context.lastAssignmentsByTask.get(taskId) ?? new Map();
  const now = new Date();
  const scores: MemberScore[] = [];

  const filteredMembers = options?.onlyAdults
    ? context.members.filter((m) => m.memberType === "ADULT")
    : context.members;

  for (const member of filteredMembers) {
    if (isAbsentOnDate(member.absences, targetDate)) continue;

    const reasons: string[] = [];
    let score = 100;

    // Preference: filter to this task's preference
    const preference = member.preferences.find((p) => p.taskId === taskId);
    if (preference) {
      if (preference.preference === "PREFERRED") {
        score += 20;
        reasons.push("+20 tarea preferida");
      } else if (preference.preference === "DISLIKED") {
        score -= 20;
        reasons.push("-20 tarea no deseada");
      }
    }

    // Load penalty
    const pendingCount = member.assignments.length;
    const loadPenalty = pendingCount * 5;
    score -= loadPenalty;
    if (loadPenalty > 0) {
      reasons.push(`-${loadPenalty} por ${pendingCount} tareas pendientes`);
    }

    // Recency
    const lastCompleted = lastAssignmentMap.get(member.id);
    if (lastCompleted) {
      const daysSince = Math.floor(
        (now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24)
      );
      const recencyBonus = Math.min(daysSince, 14);
      score += recencyBonus;
      if (recencyBonus > 0) {
        reasons.push(`+${recencyBonus} por ${daysSince} días sin esta tarea`);
      }
    } else {
      score += 14;
      reasons.push("+14 nunca ha hecho esta tarea");
    }

    // Capacity
    const capacity = MEMBER_CAPACITY[member.memberType];
    score = Math.round(score * capacity);
    if (capacity < 1) {
      reasons.push(`×${capacity} capacidad ${member.memberType.toLowerCase()}`);
    }

    // Min age filter
    if (task.minAge !== null) {
      const memberAge =
        member.memberType === "CHILD" ? 10 : member.memberType === "TEEN" ? 15 : 25;
      if (memberAge < task.minAge) continue;
    }

    scores.push({ memberId: member.id, memberName: member.name, score, reasons });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores;
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
  // Use dueDate for absence checking — returns scores alongside best pick
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

  return {
    assignment,
    scores,
    selectedMember: best,
  };
}

/**
 * Auto-assign ALL active tasks in a household.
 * Uses AI planning if available, otherwise falls back to deterministic algorithm.
 * Skips tasks that already have pending assignments.
 */
export async function autoAssignAllTasks(
  householdId: string,
  options?: { useAI?: boolean }
): Promise<{
  success: boolean;
  assignmentsCreated: number;
  method: "ai" | "algorithm";
  details: Array<{ taskName: string; memberName: string }>;
  balanceScore?: number;
}> {
  const useAI = options?.useAI ?? true;

  // Try AI planning first if enabled
  if (useAI) {
    try {
      const { generateAndApplyPlan } = await import("./llm/ai-planner");
      const result = await generateAndApplyPlan(householdId);

      if (result.success && result.plan) {
        return {
          success: true,
          assignmentsCreated: result.assignmentsCreated,
          method: "ai",
          details: result.plan.assignments.map((a) => ({
            taskName: a.taskName,
            memberName: a.memberName,
          })),
          balanceScore: result.plan.balanceScore,
        };
      }
    } catch (error) {
      console.error("AI planning failed, falling back to algorithm:", error);
    }
  }

  // Fallback to deterministic algorithm with batch scoring
  const allTasks = await prisma.task.findMany({
    where: { householdId, isActive: true },
    select: { id: true, name: true, frequency: true },
  });

  // Batch existence check: 1 query instead of N
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
    return { success: true, assignmentsCreated: 0, method: "algorithm", details: [] };
  }

  const now = new Date();
  const taskIds = tasksToAssign.map((t) => t.id);

  // Pre-load all scoring data in 3 parallel queries instead of N×2
  const batchContext = await loadBatchScoreContext(householdId, taskIds, now);

  const details: Array<{ taskName: string; memberName: string }> = [];

  for (const task of tasksToAssign) {
    let scores = calculateScoresFromContext(batchContext, task.id, now);
    if (scores.length === 0) {
      // Retry with only adults if age filter excluded everyone
      const fullTask = batchContext.tasks.find((t) => t.id === task.id);
      if (fullTask?.minAge != null) {
        scores = calculateScoresFromContext(batchContext, task.id, now, { onlyAdults: true });
      }
    }

    const best = scores[0];
    if (!best) continue;

    try {
      const dueDate = computeDueDateForFrequency(task.frequency as TaskFrequency, now);
      await prisma.assignment.create({
        data: { taskId: task.id, memberId: best.memberId, householdId, dueDate },
      });

      details.push({ taskName: task.name, memberName: best.memberName });
    } catch (error) {
      console.error(`Failed to assign task ${task.name}:`, error);
    }
  }

  return {
    success: true,
    assignmentsCreated: details.length,
    method: "algorithm",
    details,
  };
}
