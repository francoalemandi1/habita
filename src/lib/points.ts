import { POINTS } from "@/types";

import type { TaskFrequency } from "@prisma/client";

interface CalculatePointsParams {
  weight: number;
  frequency: TaskFrequency;
  isOnTime: boolean;
  streakDays: number;
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
 * Formula:
 * base_points = weight × frequency_multiplier × 10
 * on_time_bonus = +20% if completed on time
 * streak_bonus = +10% if streak >= 3 days
 *
 * @returns Total points earned (integer)
 */
export function calculatePoints({
  weight,
  frequency,
  isOnTime,
  streakDays,
}: CalculatePointsParams): number {
  const frequencyMultiplier = FREQUENCY_MULTIPLIER[frequency];
  const basePoints = weight * frequencyMultiplier * POINTS.BASE_MULTIPLIER;

  let totalPoints = basePoints;

  // On-time bonus
  if (isOnTime) {
    totalPoints += basePoints * POINTS.ON_TIME_BONUS;
  }

  // Streak bonus
  if (streakDays >= POINTS.STREAK_THRESHOLD) {
    totalPoints += basePoints * POINTS.STREAK_BONUS;
  }

  return Math.round(totalPoints);
}

export interface PointsBreakdown {
  total: number;
  base: number;
  onTimeBonus: number;
  streakBonus: number;
  isOnTime: boolean;
  streakDays: number;
}

/**
 * Calculate points with detailed breakdown of each bonus.
 */
export function calculatePointsWithBreakdown({
  weight,
  frequency,
  isOnTime,
  streakDays,
}: CalculatePointsParams): PointsBreakdown {
  const frequencyMultiplier = FREQUENCY_MULTIPLIER[frequency];
  const base = weight * frequencyMultiplier * POINTS.BASE_MULTIPLIER;
  const onTimeBonus = isOnTime ? Math.round(base * POINTS.ON_TIME_BONUS) : 0;
  const streakBonus =
    streakDays >= POINTS.STREAK_THRESHOLD ? Math.round(base * POINTS.STREAK_BONUS) : 0;

  return {
    total: Math.round(base + onTimeBonus + streakBonus),
    base: Math.round(base),
    onTimeBonus,
    streakBonus,
    isOnTime,
    streakDays,
  };
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
