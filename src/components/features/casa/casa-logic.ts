import { z } from "zod";

import type { AssignmentStatus, MemberType } from "@prisma/client";
import type { CheckboxState } from "@/components/ds/checkbox";

export type TodayAssignmentStatus = AssignmentStatus;

interface AssignmentForToday {
  memberId: string;
  dueDate: Date;
  status: string;
}

/** Casa board only shows the current member's own tasks due today (handoff §5.3 "Casa"). */
export function filterTodayAssignments<T extends AssignmentForToday>(
  assignments: readonly T[],
  currentMemberId: string,
  today: Date,
): T[] {
  return assignments.filter(
    (assignment) =>
      assignment.memberId === currentMemberId &&
      assignment.status !== "CANCELLED" &&
      isSameCalendarDay(assignment.dueDate, today),
  );
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Casa board "Mañana" preview (C1): same filter as today, shifted one calendar day. */
export function filterTomorrowAssignments<T extends AssignmentForToday>(
  assignments: readonly T[],
  currentMemberId: string,
  today: Date,
): T[] {
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  return assignments.filter(
    (assignment) =>
      assignment.memberId === currentMemberId &&
      assignment.status !== "CANCELLED" &&
      isSameCalendarDay(assignment.dueDate, tomorrow),
  );
}

/**
 * `/api/assignments/[id]/complete` always returns COMPLETED regardless of who
 * completed it — only an ADULT's own completion is final; everyone else's
 * still needs an adult to approve it through `/verify` (handoff §7).
 */
export function checkboxStateForAssignment(status: TodayAssignmentStatus, memberType: MemberType): CheckboxState {
  if (status === "VERIFIED") return "done";
  if (status === "COMPLETED") return memberType === "ADULT" ? "done" : "toVerify";
  return "pending";
}

export interface WeekLegendShare {
  name: string;
  done: number;
}

/** Current member first as "Vos", then the rest by name; "Parejo" appended when the split is even. */
export function buildWeekLegend(shares: readonly WeekLegendShare[], isEven: boolean): string {
  const parts = shares.map((share, index) => (index === 0 ? `Vos ${share.done}` : `${share.name} ${share.done}`));
  if (isEven) parts.push("Parejo");
  return parts.join(" · ");
}

/** Whole-peso ARS amount, e.g. "$214.800" (handoff §9.3 — montos tabular). */
export function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

/** "Noviembre" — capitalized month name for the Plata card header. */
export function formatMonthHeader(date: Date): string {
  const label = date.toLocaleDateString("es-AR", { month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "hoy" / "ayer" / "hace N días" for a saved cart's age. */
export function relativeDaysLabel(from: Date, now: Date): string {
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((nowDay.getTime() - fromDay.getTime()) / 86_400_000);
  if (diffDays <= 0) return "hoy";
  if (diffDays === 1) return "ayer";
  return `hace ${diffDays} días`;
}

const cartProductsSchema = z.array(z.unknown());

/** `SavedCart.products` is an untyped Json column — validate before counting. */
export function countCartProducts(products: unknown): number {
  const parsed = cartProductsSchema.safeParse(products);
  return parsed.success ? parsed.data.length : 0;
}

export interface PendingTransferSummary {
  taskName: string;
  fromName: string;
}

/** "Para resolver" banner copy — singular names the task, plural just counts (handoff §10 voice). */
export function buildTransfersBannerText(transfers: readonly PendingTransferSummary[]): string | null {
  if (transfers.length === 0) return null;
  if (transfers.length === 1) {
    const [transfer] = transfers;
    return `${transfer!.fromName} te quiere pasar «${transfer!.taskName}»`;
  }
  return `Tenés ${transfers.length} pedidos de cambio`;
}

/** Events within this many calendar days are named by weekday alone ("Viernes 21:00 h"). */
const NEAR_EVENT_MAX_DAYS = 6;
const WEEKEND_DAYS: ReadonlySet<string> = new Set(["sábado", "domingo"]);

export interface DestacadoDate {
  label: string;
  isThisWeekend: boolean;
}

function calendarDayIndex(date: Date, timeZone: string): number {
  const [year = 0, month = 1, day = 1] = date.toLocaleDateString("en-CA", { timeZone }).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

/**
 * Destacado card date. A bare weekday only reads right for the coming days: an event three weeks
 * out labelled "Viernes" looks like this Friday, so farther events carry the day and month.
 */
export function describeDestacadoDate(startDate: Date, now: Date, timeZone: string): DestacadoDate {
  const time = startDate.toLocaleTimeString("es-AR", { hour: "numeric", minute: "2-digit", timeZone });
  const weekday = startDate.toLocaleDateString("es-AR", { weekday: "long", timeZone });
  const isNear = calendarDayIndex(startDate, timeZone) - calendarDayIndex(now, timeZone) <= NEAR_EVENT_MAX_DAYS;
  if (isNear) {
    return { label: `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${time} h`, isThisWeekend: WEEKEND_DAYS.has(weekday) };
  }
  const shortDate = startDate.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", timeZone }).replace(/\./g, "").replace(",", "");
  return { label: `${shortDate.charAt(0).toUpperCase()}${shortDate.slice(1)} · ${time} h`, isThisWeekend: false };
}
