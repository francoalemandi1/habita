/**
 * Pure bank-promo scoring for the Súper Comparar bank promo banner.
 * Duplicated from src/lib/promos/scoring.ts (web) — that version imports the
 * Prisma `BankPromo` type, unavailable on mobile; this one uses the
 * `@habita/contracts` BankPromo, otherwise identical.
 *
 * Score formula: discountPercent + 5 (no cap) + 10 (applies today), 0 if expired.
 */

import type { BankPromo } from "@habita/contracts";

const DAY_INDEX_TO_NAME: Record<number, string> = {
  0: "domingo",
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábado",
};

const DAY_SHORT: Record<string, string> = {
  lunes: "Lun",
  martes: "Mar",
  "miércoles": "Mié",
  jueves: "Jue",
  viernes: "Vie",
  "sábado": "Sáb",
  domingo: "Dom",
};

export function getTodayDayName(): string {
  return DAY_INDEX_TO_NAME[new Date().getDay()] ?? "lunes";
}

function normalizeDay(day: string): string {
  const lower = day.toLowerCase().trim();
  switch (lower) {
    case "miercoles":
      return "miércoles";
    case "sabado":
      return "sábado";
    default:
      return lower;
  }
}

export function parseDaysOfWeek(daysOfWeek: string): string[] {
  try {
    const parsed: unknown = JSON.parse(daysOfWeek);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/** Returns true if the promo's validUntil is in the past. */
export function isPromoExpired(promo: BankPromo): boolean {
  if (!promo.validUntil) return false;
  const expiry = new Date(promo.validUntil);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiry < today;
}

/** Check if a promo applies on a given day (case-insensitive, accent-tolerant). */
export function promoAppliesToday(promo: BankPromo, todayDayName: string): boolean {
  const days = parseDaysOfWeek(promo.daysOfWeek);
  if (days.length === 0) return true;
  const normalizedToday = normalizeDay(todayDayName);
  return days.some((d) => normalizeDay(d) === normalizedToday);
}

/** Score a single promo. Higher = better. Expired promos score 0. */
export function scorePromo(promo: BankPromo, todayDayName: string): number {
  if (isPromoExpired(promo)) return 0;
  let score = promo.discountPercent;
  if (!promo.capAmount) score += 5;
  if (promoAppliesToday(promo, todayDayName)) score += 10;
  return score;
}

/** Best promo per bank, sorted by score descending. Expired promos excluded. */
export function getBestPromosByBank(promos: BankPromo[], todayName: string): BankPromo[] {
  const active = promos.filter((p) => !isPromoExpired(p));
  const bankMap = new Map<string, BankPromo>();
  for (const promo of active) {
    const existing = bankMap.get(promo.bankSlug);
    if (!existing || scorePromo(promo, todayName) > scorePromo(existing, todayName)) {
      bankMap.set(promo.bankSlug, promo);
    }
  }
  return [...bankMap.values()].sort((a, b) => scorePromo(b, todayName) - scorePromo(a, todayName));
}

/** Discounted total for `totalPrice`, capped at `capAmount` when present. */
export function calcDiscountedPrice(totalPrice: number, discountPercent: number, capAmount: number | null): number {
  const rawDiscount = (totalPrice * discountPercent) / 100;
  const actualDiscount = capAmount && capAmount > 0 ? Math.min(rawDiscount, capAmount) : rawDiscount;
  return Math.round(totalPrice - actualDiscount);
}

export function formatDaysShort(daysOfWeekJson: string): string {
  const days = parseDaysOfWeek(daysOfWeekJson);
  if (days.length === 0 || days.length === 7) return "Todos los días";
  return days.map((d) => DAY_SHORT[normalizeDay(d)] ?? d).join(", ");
}
