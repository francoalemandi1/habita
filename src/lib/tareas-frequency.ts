import { taskFrequencySchema } from "@habita/contracts";

import type { TaskFrequency } from "@prisma/client";

/** Every `TaskFrequency` value, in the order forms should offer them. */
export const TASK_FREQUENCIES = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "ONCE"] as const satisfies readonly TaskFrequency[];

const DEFAULT_FREQUENCY: TaskFrequency = "WEEKLY";

/** Parses an arbitrary-case frequency string (e.g. the catalog's lowercase `defaultFrequency`); falls back when invalid. */
export function parseTaskFrequency(value: string, fallback: TaskFrequency = DEFAULT_FREQUENCY): TaskFrequency {
  const result = taskFrequencySchema.safeParse(value.toUpperCase());
  return result.success ? result.data : fallback;
}
