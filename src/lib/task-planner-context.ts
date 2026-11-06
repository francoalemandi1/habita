import { availabilitySchema } from "@habita/contracts";

import { prisma } from "./prisma";

import type {
  PlannerMember,
  PlannerPreference,
  PlannerRecentAssignment,
  PlannerTask,
  ScoreCandidate,
  TaskPlannerSnapshot,
} from "@habita/domain";

/** Bounded history window for recency scoring (spec: recency bonus caps at 14 days). */
const HISTORY_WINDOW_DAYS = 30;

const WEEKDAY_KEYS = ["1", "2", "3", "4", "5", "6", "7"] as const;

/**
 * A weekday with an explicit empty slot array means the member is unavailable
 * that whole day; a missing weekday means no restriction.
 */
function computeUnavailableWeekdays(availability: unknown): number[] {
  if (availability === null || availability === undefined) return [];

  const parsed = availabilitySchema.safeParse(availability);
  if (!parsed.success) {
    console.warn("[task-planner-context] Ignoring malformed member availability", parsed.error.issues);
    return [];
  }
  const unavailable: number[] = [];
  for (const key of WEEKDAY_KEYS) {
    const slots = parsed.data[key];
    if (slots && slots.length === 0) {
      unavailable.push(Number(key));
    }
  }
  return unavailable;
}

/**
 * Load a household's full planning snapshot: active members, active tasks,
 * preferences, and a bounded window of recent assignments.
 */
export async function loadTaskPlannerSnapshot(householdId: string): Promise<TaskPlannerSnapshot> {
  const historySince = new Date();
  historySince.setDate(historySince.getDate() - HISTORY_WINDOW_DAYS);

  const [members, tasks, preferences, recentAssignments] = await Promise.all([
    prisma.member.findMany({
      where: { householdId, isActive: true },
      select: {
        id: true,
        name: true,
        memberType: true,
        availability: true,
        absences: { select: { startDate: true, endDate: true } },
      },
    }),
    prisma.task.findMany({
      where: { householdId, isActive: true },
      select: {
        id: true,
        name: true,
        frequency: true,
        weight: true,
        minAge: true,
        estimatedMinutes: true,
        isRotating: true,
      },
    }),
    prisma.memberPreference.findMany({
      where: { member: { householdId } },
      select: { memberId: true, taskId: true, preference: true },
    }),
    prisma.assignment.findMany({
      where: {
        householdId,
        OR: [
          { status: { in: ["PENDING", "IN_PROGRESS"] } },
          { status: { in: ["COMPLETED", "VERIFIED"] }, completedAt: { gte: historySince } },
        ],
      },
      select: {
        taskId: true,
        memberId: true,
        completedByMemberId: true,
        dueDate: true,
        status: true,
        completedAt: true,
      },
    }),
  ]);

  const plannerMembers: PlannerMember[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    memberType: m.memberType,
    absences: m.absences,
    unavailableWeekdays: computeUnavailableWeekdays(m.availability),
  }));

  const plannerTasks: PlannerTask[] = tasks;

  const plannerPreferences: PlannerPreference[] = preferences;

  // Recency scoring must credit the actual completer, not the original assignee.
  const plannerAssignments: PlannerRecentAssignment[] = recentAssignments.map((a) => ({
    taskId: a.taskId,
    memberId:
      a.status === "COMPLETED" || a.status === "VERIFIED" ? a.completedByMemberId ?? a.memberId : a.memberId,
    dueDate: a.dueDate,
    status: a.status,
    completedAt: a.completedAt,
  }));

  return {
    members: plannerMembers,
    tasks: plannerTasks,
    preferences: plannerPreferences,
    recentAssignments: plannerAssignments,
  };
}

/** Member summary for a single scored candidate, used by routes that need Prisma-backed names. */
export interface ResolvedAssignee {
  memberId: string;
  memberName: string;
}

export function toResolvedAssignee(candidate: ScoreCandidate): ResolvedAssignee {
  return { memberId: candidate.memberId, memberName: candidate.memberName };
}
