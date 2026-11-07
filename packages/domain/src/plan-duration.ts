import type { PlannerTaskFrequency } from "./task-planner";

/** Minimum number of days a task's frequency requires to be relevant in a plan. */
const FREQUENCY_MIN_DAYS: Record<PlannerTaskFrequency, number> = {
  DAILY: 1,
  ONCE: 1,
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 30,
};

export interface PlannerExcludedTask {
  taskName: string;
  frequency: PlannerTaskFrequency;
}

/**
 * Split tasks into included (fit within plan duration) and excluded (too infrequent).
 * A task is included if its frequency's minimum days <= durationDays.
 */
export function partitionTasksByDuration<T extends { frequency: PlannerTaskFrequency }>(
  tasks: T[],
  durationDays: number,
): { included: T[]; excluded: T[] } {
  const included: T[] = [];
  const excluded: T[] = [];

  for (const task of tasks) {
    const minDays = FREQUENCY_MIN_DAYS[task.frequency] ?? 7;
    if (minDays <= durationDays) {
      included.push(task);
    } else {
      excluded.push(task);
    }
  }

  return { included, excluded };
}
