/**
 * Client-side scoring for bank promotions.
 *
 * Score formula:
 *   discountPercent
 *   + 5   if no cap (capAmount is null or 0)
 *   + 10  if the promo applies today
 *   → 0   if the promo is expired (validUntil < today)
 *
 * Scores are NOT stored in the DB — computed at render time.
 */

import type { BankPromo } from "@prisma/client";

// ============================================
// Day name mapping (promoarg uses Spanish)
// ============================================

const DAY_INDEX_TO_NAME: Record<number, string> = {
  0: "domingo",
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábado",
};

/** Get today's day name in lowercase Spanish (canonical form). */
export function getTodayDayName(): string {
  return DAY_INDEX_TO_NAME[new Date().getDay()] ?? "lunes";
}

// ============================================
// Expiry check
// ============================================

/** Returns true if the promo's validUntil is in the past. */
export function isPromoExpired(promo: BankPromo): boolean {
  if (!promo.validUntil) return false;
  const expiry = new Date(promo.validUntil);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiry < today;
}

// ============================================
// Day matching
// ============================================

/**
 * Normalize a day name to lowercase + canonical accents.
 * Handles: "Miercoles" → "miércoles", "SABADO" → "sábado", "Jueves" → "jueves"
 */
function normalizeDay(day: string): string {
  const lower = day.toLowerCase().trim();
  switch (lower) {
    case "miercoles": return "miércoles";
    case "sabado":    return "sábado";
    default:          return lower;
  }
}

/** Check if a promo applies on a given day (case-insensitive, accent-tolerant). */
export function promoAppliesToday(promo: BankPromo, todayDayName: string): boolean {
  const days = parseDaysOfWeek(promo.daysOfWeek);
  if (days.length === 0) return true; // empty = all days
  const normalizedToday = normalizeDay(todayDayName);
  return days.some((d) => normalizeDay(d) === normalizedToday);
}

// ============================================
// Scoring
// ============================================

/** Score a single promo. Higher = better. Expired promos score 0. */
export function scorePromo(promo: BankPromo, todayDayName: string): number {
  if (isPromoExpired(promo)) return 0;

  let score = promo.discountPercent;

  // Bonus: no cap
  if (!promo.capAmount) {
    score += 5;
  }

  // Bonus: applies today
  if (promoAppliesToday(promo, todayDayName)) {
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
