import { differenceInCalendarDays, startOfDay, isBefore } from "date-fns";

import type { TaskFrequency } from "@prisma/client";

/** Minimum number of days a task's frequency requires to be relevant in a plan */
const FREQUENCY_MIN_DAYS: Record<TaskFrequency, number> = {
  DAILY: 1,
  ONCE: 1,
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 30,
};

export interface DurationPreset {
  label: string;
  days: number;
}

export const DURATION_PRESETS: DurationPreset[] = [
  { label: "1 día", days: 1 },
  { label: "3 días", days: 3 },
  { label: "1 semana", days: 7 },
  { label: "2 semanas", days: 14 },
  { label: "1 mes", days: 30 },
];

export interface ExcludedTask {
  taskName: string;
  frequency: TaskFrequency;
}

interface TaskForPartition {
  name: string;
  frequency: TaskFrequency;
}

/**
 * Split tasks into included (fit within plan duration) and excluded (too infrequent).
 * A task is included if its frequency's minimum days <= durationDays.
 */
export function partitionTasksByDuration<T extends TaskForPartition>(
  tasks: T[],
  durationDays: number
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

/** Human-readable label for a duration in days */
export function durationLabel(days: number): string {
  const preset = DURATION_PRESETS.find((p) => p.days === days);
  if (preset) return preset.label;
  return `${days} ${days === 1 ? "día" : "días"}`;
}

/** Maximum plan duration in days */
export const MAX_PLAN_DURATION_DAYS = 30;

/** Compute duration in days from a date range (inclusive of both endpoints) */
export function computeDurationDays(startDate: Date, endDate: Date): number {
  return differenceInCalendarDays(endDate, startDate) + 1;
}

/** Validate a date range for plan creation */
export function validateDateRange(
  planStartDate: Date,
  planEndDate: Date
): { isValid: boolean; error?: string } {
  const today = startOfDay(new Date());

  if (isBefore(startOfDay(planStartDate), today)) {
    return { isValid: false, error: "La fecha de inicio no puede ser en el pasado" };
  }

  if (isBefore(startOfDay(planEndDate), startOfDay(planStartDate))) {
    return { isValid: false, error: "La fecha de fin debe ser posterior a la de inicio" };
  }

  const duration = computeDurationDays(planStartDate, planEndDate);
  if (duration > MAX_PLAN_DURATION_DAYS) {
    return { isValid: false, error: `La duración máxima es ${MAX_PLAN_DURATION_DAYS} días` };
  }

  return { isValid: true };
}
