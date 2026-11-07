import { differenceInCalendarDays, startOfDay, isBefore } from "date-fns";
import { partitionTasksByDuration } from "@habita/domain";

import type { PlannerExcludedTask } from "@habita/domain";

/** Re-exported from @habita/domain so existing imports of `@/lib/plan-duration` keep working. */
export { partitionTasksByDuration };
export type ExcludedTask = PlannerExcludedTask;

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
