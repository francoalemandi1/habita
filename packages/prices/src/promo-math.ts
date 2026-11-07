/**
 * Pure bank-promo math shared by web, mobile and the MCP tools.
 *
 * `PromoLike` is structural so this package depends on neither Prisma nor
 * `@habita/contracts` — any shape (DB row, API response, MCP cache entry)
 * that has these fields works.
 */

export interface PromoLike {
  bankSlug: string;
  discountPercent: number;
  capAmount: number | null;
  /** JSON array string (DB/API shape) or an already parsed list (MCP cache shape). */
  daysOfWeek: string | readonly string[];
  validUntil: string | Date | null;
}

const DAY_INDEX_TO_NAME: Record<number, string> = {
  0: "domingo",
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábado",
};

const DAY_SHORT_LABELS: Record<string, string> = {
  lunes: "Lun",
  martes: "Mar",
  miercoles: "Mié",
  jueves: "Jue",
  viernes: "Vie",
  sabado: "Sáb",
  domingo: "Dom",
};

/** Argentina has had no DST since 2009, so its offset from UTC is always fixed. */
const ARGENTINA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Parse a `daysOfWeek` JSON array string. Invalid JSON or a non-array gives `[]`. */
export function parseDaysOfWeek(json: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is string => typeof item === "string");
}

function resolveDaysOfWeek(daysOfWeek: string | readonly string[]): readonly string[] {
  return typeof daysOfWeek === "string" ? parseDaysOfWeek(daysOfWeek) : daysOfWeek;
}

/** Lowercase, accent-stripped form for case/accent-insensitive comparisons. */
function normalizeDayForCompare(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Lowercase Spanish day name ("domingo"…"sábado") for `date`. */
export function getLocalDayName(date: Date): string {
  return DAY_INDEX_TO_NAME[date.getDay()] ?? "domingo";
}

function toUtcDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * Expired iff Argentina's calendar date for `now` is strictly after the UTC
 * calendar date of `validUntil`. promoarg sends date-only strings like
 * "2026-10-28", stored as `new Date("2026-10-28")` = midnight UTC, so a promo
 * valid "through 2026-10-28" is valid through 23:59 Argentina time that day —
 * i.e. until 02:59 UTC on the 29th. `null` means never expired; an
 * unparseable date is treated as not expired (matches prior behavior).
 */
export function isPromoExpired(promo: PromoLike, now: Date): boolean {
  if (!promo.validUntil) return false;
  const expiry = new Date(promo.validUntil);
  if (Number.isNaN(expiry.getTime())) return false;
  // A fixed offset keeps web, mobile (Hermes) and server identical without
  // depending on each runtime's Intl time-zone data.
  const argentinaToday = toUtcDateString(new Date(now.getTime() - ARGENTINA_UTC_OFFSET_MS));
  const expiryUtcDate = toUtcDateString(expiry);
  return argentinaToday > expiryUtcDate;
}

/** Empty `daysOfWeek` means the promo applies every day. */
export function promoAppliesOnDay(promo: PromoLike, dayName: string): boolean {
  const days = resolveDaysOfWeek(promo.daysOfWeek);
  if (days.length === 0) return true;
  const normalizedTarget = normalizeDayForCompare(dayName);
  return days.some((day) => normalizeDayForCompare(day) === normalizedTarget);
}

/** Score a single promo. Higher = better. Expired promos score 0. */
export function scorePromo(promo: PromoLike, dayName: string, now: Date): number {
  if (isPromoExpired(promo, now)) return 0;
  let score = promo.discountPercent;
  if (!promo.capAmount) score += 5;
  if (promoAppliesOnDay(promo, dayName)) score += 10;
  return score;
}

/** Best (highest score) unexpired promo per `bankSlug`, sorted by score descending. */
export function bestPromoPerBank<T extends PromoLike>(
  promos: readonly T[],
  dayName: string,
  now: Date,
): T[] {
  const bestByBank = new Map<string, T>();
  for (const promo of promos) {
    if (isPromoExpired(promo, now)) continue;
    const existing = bestByBank.get(promo.bankSlug);
    if (!existing || scorePromo(promo, dayName, now) > scorePromo(existing, dayName, now)) {
      bestByBank.set(promo.bankSlug, promo);
    }
  }
  return [...bestByBank.values()].sort((a, b) => scorePromo(b, dayName, now) - scorePromo(a, dayName, now));
}

/** Unexpired promos sorted by score descending, as a new array. */
export function sortActivePromosByScore<T extends PromoLike>(
  promos: readonly T[],
  dayName: string,
  now: Date,
): T[] {
  return promos
    .filter((promo) => !isPromoExpired(promo, now))
    .sort((a, b) => scorePromo(b, dayName, now) - scorePromo(a, dayName, now));
}

/** Discounted total for `totalPrice`, capped at `capAmount` when present. */
export function discountedPrice(totalPrice: number, discountPercent: number, capAmount: number | null): number {
  const rawDiscount = (totalPrice * discountPercent) / 100;
  const actualDiscount = capAmount && capAmount > 0 ? Math.min(rawDiscount, capAmount) : rawDiscount;
  return Math.round(totalPrice - actualDiscount);
}

/** Short day labels ("Lun, Mar, …"), or `allDaysLabel` for an empty or 7-day list. */
export function formatDaysShort(
  days: string | readonly string[],
  options: { allDaysLabel: string },
): string {
  const resolved = resolveDaysOfWeek(days);
  if (resolved.length === 0 || resolved.length === 7) return options.allDaysLabel;
  return resolved.map((day) => DAY_SHORT_LABELS[normalizeDayForCompare(day)] ?? day).join(", ");
}
