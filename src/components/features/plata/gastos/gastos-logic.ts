/**
 * Pure functions for the Gastos view (handoff §5.3 "Plata" — Gastos).
 * No side effects, no DB access — fully deterministic and testable.
 */

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;

const MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;
const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** L1 month label, e.g. "NOVIEMBRE". */
export function formatMonthLabel(date: Date): string {
  return MONTH_NAMES[date.getMonth()]!.toUpperCase();
}

/** "Octubre" from a "YYYY-MM" key, for the month-comparison line. */
export function monthKeyToLabel(monthKey: string): string {
  const monthIndex = Number(monthKey.slice(5, 7)) - 1;
  return capitalize(MONTH_NAMES[monthIndex] ?? "");
}

/** "Hoy" / "Ayer" / "Lunes 2 nov" day-group header. */
export function dayGroupLabel(date: Date, now: Date): string {
  if (isSameCalendarDay(date, now)) return "Hoy";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameCalendarDay(date, yesterday)) return "Ayer";

  return `${capitalize(WEEKDAY_NAMES[date.getDay()]!)} ${date.getDate()} ${MONTH_ABBR[date.getMonth()]}`;
}

export interface DayGroup<T> {
  key: string;
  label: string;
  items: T[];
}

/** Groups already date-desc-sorted rows into day buckets, preserving order. */
export function groupExpensesByDay<T extends { date: string | Date }>(
  rows: readonly T[],
  now: Date,
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];

  for (const row of rows) {
    const date = typeof row.date === "string" ? new Date(row.date) : row.date;
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const last = groups[groups.length - 1];

    if (last && last.key === key) {
      last.items.push(row);
    } else {
      groups.push({ key, label: dayGroupLabel(date, now), items: [row] });
    }
  }

  return groups;
}

/** "Pagaste vos · entre 3" / "Pagó Sofi · entre 3" / "Pagaste vos · solo vos" row meta text (§5.3 Plata). */
export function payerMetaText({
  paidByName,
  isCurrentUserPayer,
  splitCount,
}: {
  paidByName: string;
  isCurrentUserPayer: boolean;
  splitCount: number;
}): string {
  const payer = isCurrentUserPayer ? "Pagaste vos" : `Pagó ${paidByName}`;
  if (splitCount > 1) return `${payer} · entre ${splitCount}`;
  return isCurrentUserPayer ? `${payer} · solo vos` : payer;
}

function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

export interface MonthTotalPoint {
  month: string;
  total: number;
}

/**
 * "8% menos que octubre · proyección $268.000". Returns null when the trend
 * isn't reliable yet or there's no previous month to compare against.
 */
export function buildMonthComparisonText({
  hasReliableMonthlyTrend,
  monthlyHistory,
  projectedTotal,
}: {
  hasReliableMonthlyTrend: boolean;
  monthlyHistory: readonly MonthTotalPoint[];
  projectedTotal: number;
}): string | null {
  if (!hasReliableMonthlyTrend) return null;
  if (monthlyHistory.length < 2) return null;

  const current = monthlyHistory[monthlyHistory.length - 1]!;
  const previous = monthlyHistory[monthlyHistory.length - 2]!;
  if (previous.total <= 0) return null;

  const percent = Math.round((Math.abs(current.total - previous.total) / previous.total) * 100);
  const trendWord = current.total <= previous.total ? "menos" : "más";
  const previousLabel = monthKeyToLabel(previous.month);

  return `${percent}% ${trendWord} que ${previousLabel.toLowerCase()} · proyección ${formatArs(projectedTotal)}`;
}

export interface MiniBar {
  month: string;
  total: number;
  isCurrent: boolean;
}

/** Marks the last point (current month) for the mini bars' highlight color. */
export function buildMiniBars(monthlyHistory: readonly MonthTotalPoint[]): MiniBar[] {
  return monthlyHistory.map((point, index) => ({
    ...point,
    isCurrent: index === monthlyHistory.length - 1,
  }));
}
