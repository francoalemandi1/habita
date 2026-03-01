/**
 * Client-side scoring for bank promotions.
 *
 * Score formula:
 *   discountPercent
 *   + 5   if no cap (capAmount is null or 0)
 *   + 10  if the promo applies today
 *
 * Scores are NOT stored in the DB — computed at render time.
 */

import type { BankPromo } from "@prisma/client";

// ============================================
// Day name mapping (promoarg uses Spanish)
// ============================================

const DAY_INDEX_TO_NAME: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

/** Get today's day name in the format promoarg.com uses. */
export function getTodayDayName(): string {
  return DAY_INDEX_TO_NAME[new Date().getDay()] ?? "Lunes";
}

// ============================================
// Scoring
// ============================================

/** Score a single promo. Higher = better. */
export function scorePromo(promo: BankPromo, todayDayName: string): number {
  let score = promo.discountPercent;

  // Bonus: no cap
  if (!promo.capAmount) {
    score += 5;
  }

  // Bonus: applies today
  const days = parseDaysOfWeek(promo.daysOfWeek);
  if (days.length === 0 || days.includes(todayDayName)) {
    score += 10;
  }

  return score;
}

/** Score a store by its best promo. Higher = better. */
export function scoreStore(promos: BankPromo[], todayDayName: string): number {
  if (promos.length === 0) return 0;
  return Math.max(...promos.map((p) => scorePromo(p, todayDayName)));
}

/** Sort promos by score descending. Returns a new array. */
export function sortPromosByScore(promos: BankPromo[], todayDayName: string): BankPromo[] {
  return [...promos].sort(
    (a, b) => scorePromo(b, todayDayName) - scorePromo(a, todayDayName),
  );
}

// ============================================
// Helpers
// ============================================

/** Parse the daysOfWeek JSON string to an array. */
export function parseDaysOfWeek(daysOfWeek: string): string[] {
  try {
    const parsed: unknown = JSON.parse(daysOfWeek);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
