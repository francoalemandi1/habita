// ─── Points system ───────────────────────────────────────────────────────────

export interface PointsBreakdown {
  base: number;
  volumeBonus: number;
  streakBonus: number;
  total: number;
}

/**
 * Compute points for a single member.
 * - base = sum of task.weight from completed assignments
 * - volumeBonus = +3 per every 5 tasks completed
 * - streakBonus = householdStreak × 2
 */
export function computeMemberPoints(
  weeklyPoints: number,
  weeklyTasks: number,
  householdStreak: number,
): PointsBreakdown {
  const base = weeklyPoints || 0;
  const volumeBonus = Math.floor((weeklyTasks || 0) / 5) * 3;
  const streakBonus = (householdStreak || 0) * 2;
  return {
    base,
    volumeBonus,
    streakBonus,
    total: base + volumeBonus + streakBonus,
  };
}

/**
 * Sum all member totals into a household grand total.
 */
export function computeHouseholdTotal(breakdowns: PointsBreakdown[]): number {
  return breakdowns.reduce((sum, b) => sum + b.total, 0);
}

// ─── Tier labels ─────────────────────────────────────────────────────────────

export type TierColorKey = "gold" | "fire" | "primary" | "info" | "success" | "muted";

interface TierInfo {
  label: string;
  emoji: string;
  colorKey: TierColorKey;
}

const TIERS: { min: number; label: string; emoji: string; colorKey: TierColorKey }[] = [
  { min: 81, label: "Leyendas", emoji: "👑", colorKey: "gold" },
  { min: 51, label: "Máquinas", emoji: "🔥", colorKey: "fire" },
  { min: 31, label: "Productivos", emoji: "💪", colorKey: "primary" },
  { min: 16, label: "En ritmo", emoji: "🏃", colorKey: "info" },
  { min: 1, label: "Arrancando", emoji: "🌱", colorKey: "success" },
];

export function getTierLabel(totalPoints: number): TierInfo {
  for (const tier of TIERS) {
    if (totalPoints >= tier.min) return { label: tier.label, emoji: tier.emoji, colorKey: tier.colorKey };
  }
  return { label: "Semana tranqui", emoji: "😴", colorKey: "muted" };
}

/**
 * Get the next tier threshold (for progress bar).
 * Returns null if already at max tier.
 */
export function getNextTier(totalPoints: number): { label: string; emoji: string; threshold: number } | null {
  const reversedTiers = [...TIERS].reverse();
  for (const tier of reversedTiers) {
    if (totalPoints < tier.min) {
      return { label: tier.label, emoji: tier.emoji, threshold: tier.min };
    }
  }
  return null;
}
