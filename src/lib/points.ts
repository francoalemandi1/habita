import { POINTS } from "@/types";

import type { TaskFrequency } from "@prisma/client";

interface CalculatePointsParams {
  weight: number;
  frequency: TaskFrequency;
}

const FREQUENCY_MULTIPLIER: Record<TaskFrequency, number> = {
  DAILY: 0.5,
  WEEKLY: 1,
  BIWEEKLY: 1.5,
  MONTHLY: 2,
  ONCE: 1,
};

/**
 * Calculate points earned for completing a task.
 *
 * Formula: base_points = weight × frequency_multiplier × 10
 *
 * @returns Total points earned (integer)
 */
export function calculatePoints({
  weight,
  frequency,
}: CalculatePointsParams): number {
  const frequencyMultiplier = FREQUENCY_MULTIPLIER[frequency];
  return Math.round(weight * frequencyMultiplier * POINTS.BASE_MULTIPLIER);
}

export interface PointsBreakdown {
  total: number;
  base: number;
}

/**
 * Calculate points with detailed breakdown.
 */
export function calculatePointsWithBreakdown({
  weight,
  frequency,
}: CalculatePointsParams): PointsBreakdown {
  const frequencyMultiplier = FREQUENCY_MULTIPLIER[frequency];
  const base = Math.round(weight * frequencyMultiplier * POINTS.BASE_MULTIPLIER);

  return { total: base, base };
}

/**
 * Calculate XP needed for next level.
 */
export function xpForLevel(level: number): number {
  return level * POINTS.XP_PER_LEVEL;
}

/**
 * Calculate progress percentage to next level.
 */
export function levelProgress(currentXp: number, currentLevel: number): number {
  const xpInCurrentLevel = currentXp - (currentLevel - 1) * POINTS.XP_PER_LEVEL;
  const xpNeeded = POINTS.XP_PER_LEVEL;
  return Math.min(100, Math.round((xpInCurrentLevel / xpNeeded) * 100));
}
