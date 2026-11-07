/** Pure type guard for the loosely-typed `assignment.task.frequency` string (contracts keep it as `string`). */

import type { TaskFrequency } from "@habita/contracts";

const TASK_FREQUENCIES: readonly TaskFrequency[] = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "ONCE"];

export function isTaskFrequency(value: string): value is TaskFrequency {
  return (TASK_FREQUENCIES as readonly string[]).includes(value);
}

/** Narrows an assignment's loose frequency string, falling back to WEEKLY for anything unrecognized. */
export function toTaskFrequency(value: string, fallback: TaskFrequency = "WEEKLY"): TaskFrequency {
  return isTaskFrequency(value) ? value : fallback;
}
