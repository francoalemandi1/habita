/** Pure helpers for the Plan semanal screen (handoff §5.3: person cards, total time). */

import type { PlanAssignment } from "@habita/contracts";

export function getPlanWeekRange(now: Date): { startDate: string; endDate: string } {
  const end = new Date(now);
  end.setDate(now.getDate() + 6);
  return { startDate: now.toISOString(), endDate: end.toISOString() };
}

/** Groups plan assignments by memberId, preserving first-seen order. */
export function groupPlanByMember(assignments: readonly PlanAssignment[]): Map<string, PlanAssignment[]> {
  const map = new Map<string, PlanAssignment[]>();
  for (const assignment of assignments) {
    const list = map.get(assignment.memberId) ?? [];
    list.push(assignment);
    map.set(assignment.memberId, list);
  }
  return map;
}

interface TaskWithMinutes {
  name: string;
  estimatedMinutes?: number | null;
}

/** Maps task name → estimated minutes, skipping tasks without an estimate. */
export function buildMinutesByTaskName(tasks: readonly TaskWithMinutes[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const task of tasks) {
    if (task.estimatedMinutes) map.set(task.name, task.estimatedMinutes);
  }
  return map;
}

/** Sums the estimated minutes for a person's assignments; tasks with no estimate contribute 0. */
export function sumPlanMinutes(assignments: readonly PlanAssignment[], minutesByTaskName: ReadonlyMap<string, number>): number {
  return assignments.reduce((sum, assignment) => sum + (minutesByTaskName.get(assignment.taskName) ?? 0), 0);
}

/** "45 min" / "1 h" / "1 h 20 min". Returns null when there's nothing to show. */
export function formatPlanMinutes(totalMinutes: number): string | null {
  if (totalMinutes <= 0) return null;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}
