import { isSameDay } from "@/lib/calendar-utils";

export interface WeekCardTask {
  estimatedMinutes: number | null;
  frequency: string;
}

export interface WeekCardAssignmentLite {
  id: string;
  memberId: string;
  dueDate: string | Date;
  task: WeekCardTask;
}

/** Groups assignments into one bucket per day, same order/length as `days`. */
export function groupAssignmentsByDay<T extends { dueDate: string | Date }>(
  assignments: readonly T[],
  days: readonly Date[],
): T[][] {
  return days.map((day) =>
    assignments.filter((assignment) => isSameDay(new Date(assignment.dueDate), day)),
  );
}

/** Minutes a member already has assigned on a given day — used by the "Pasar a alguien" load hint. */
export function computeMemberDayLoadMinutes(
  assignments: readonly WeekCardAssignmentLite[],
  memberId: string,
  day: Date,
): number {
  return assignments
    .filter((a) => a.memberId === memberId && isSameDay(new Date(a.dueDate), day))
    .reduce((sum, a) => sum + (a.task.estimatedMinutes ?? 0), 0);
}

const FREQUENCY_META_LABELS: Record<string, string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  ONCE: "Una vez",
};

/** Task card meta line: minutes + frequency, or the transfer hint when one is pending. */
export function formatTaskCardMeta(task: WeekCardTask, pendingTransferToName: string | null): string {
  if (pendingTransferToName) return `Pedido a ${pendingTransferToName}`;
  const parts: string[] = [];
  if (task.estimatedMinutes) parts.push(`${task.estimatedMinutes} min`);
  parts.push(FREQUENCY_META_LABELS[task.frequency] ?? task.frequency);
  return parts.join(" · ");
}

export type DragTarget = { kind: "day"; date: string } | { kind: "member"; memberId: string };

const DAY_PREFIX = "day:";
const MEMBER_PREFIX = "member:";

/** Encodes a day-column or avatar drop target as a dnd-kit droppable id. */
export function encodeDropTargetId(target: DragTarget): string {
  return target.kind === "day" ? `${DAY_PREFIX}${target.date}` : `${MEMBER_PREFIX}${target.memberId}`;
}

/** Decodes a dnd-kit droppable id back into a drag target; `null` for anything unrecognized. */
export function parseDropTargetId(id: string): DragTarget | null {
  if (id.startsWith(DAY_PREFIX)) return { kind: "day", date: id.slice(DAY_PREFIX.length) };
  if (id.startsWith(MEMBER_PREFIX)) return { kind: "member", memberId: id.slice(MEMBER_PREFIX.length) };
  return null;
}

export interface AssignmentPatch {
  dueDate?: string;
  memberId?: string;
}

/** Builds the PATCH /api/assignments/[id] body for a resolved drop target. */
export function buildAssignmentPatch(target: DragTarget): AssignmentPatch {
  return target.kind === "day" ? { dueDate: target.date } : { memberId: target.memberId };
}
