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
      select: { taskId: true, memberId: true, dueDate: true, status: true, completedAt: true },
    }),
  ]);

  const plannerMembers: PlannerMember[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    memberType: m.memberType,
    absences: m.absences,
  }));

  const plannerTasks: PlannerTask[] = tasks;

  const plannerPreferences: PlannerPreference[] = preferences;

  const plannerAssignments: PlannerRecentAssignment[] = recentAssignments;

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
