import type { AssignmentSummary, AssignmentStatus } from "@habita/contracts";
import type { CheckboxState } from "@/components/ds";

const DONE_STATUSES: ReadonlySet<string> = new Set(["COMPLETED", "VERIFIED"]);

/** Monday 00:00:00 → Sunday 23:59:59.999 (local time) for the week containing `now`. */
export function getHouseholdWeekRange(now: Date): { from: string; to: string } {
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday, 0, 0, 0, 0);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);

  return { from: monday.toISOString(), to: sunday.toISOString() };
}

/** Assignments due on `now`'s local calendar day, excluding cancelled ones. */
export function filterDueToday(assignments: readonly AssignmentSummary[], now: Date): AssignmentSummary[] {
  const todayKey = now.toDateString();
  return assignments.filter(
    (assignment) => assignment.status !== "CANCELLED" && new Date(assignment.dueDate).toDateString() === todayKey,
  );
}

/** Assignments still open (not done, not cancelled) among today's. */
export function isAssignmentOpen(assignment: AssignmentSummary): boolean {
  return !DONE_STATUSES.has(assignment.status) && assignment.status !== "CANCELLED";
}

/**
 * §6.2/§7 checkbox state for an assignment. The backend always marks a
 * completion as `COMPLETED`; TEEN/CHILD completions stay `toVerify` until an
 * adult explicitly verifies them (status becomes `VERIFIED`).
 */
export function toCheckboxState(status: AssignmentStatus, requiresVerification: boolean): CheckboxState {
  if (status === "VERIFIED") return "done";
  if (status === "COMPLETED") return requiresVerification ? "toVerify" : "done";
  return "pending";
}
