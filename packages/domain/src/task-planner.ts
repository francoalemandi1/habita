/**
 * Deterministic task-assignment engine (spec §2 "Algoritmo de Asignación").
 * Pure: no Prisma, no Date.now() — every caller passes `now` explicitly.
 */

import { partitionTasksByDuration } from "./plan-duration";

import type { PlannerExcludedTask } from "./plan-duration";

export { partitionTasksByDuration };
export type { PlannerExcludedTask };

export type PlannerMemberType = "ADULT" | "TEEN" | "CHILD";
export type PlannerPreferenceType = "PREFERRED" | "NEUTRAL" | "DISLIKED";
export type PlannerTaskFrequency = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "ONCE";
export type PlannerAssignmentStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "VERIFIED"
  | "OVERDUE"
  | "CANCELLED";

/** Capacity multiplier by member type (spec §2). */
export const PLANNER_MEMBER_CAPACITY: Record<PlannerMemberType, number> = {
  ADULT: 1.0,
  TEEN: 0.6,
  CHILD: 0.3,
};

/** Fallback age used when a member has no explicit age (today's behavior, ported as-is). */
const FALLBACK_AGE_BY_TYPE: Record<PlannerMemberType, number> = {
  CHILD: 10,
  TEEN: 15,
  ADULT: 25,
};

const DAY_LABELS_ES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/** Maximum number of absence notes surfaced per plan (spec: keep the preview short). */
const MAX_ABSENCE_NOTES = 3;

export interface PlannerMember {
  id: string;
  name: string;
  memberType: PlannerMemberType;
  /** Explicit age when known; falls back to a type-based estimate (today's semantics). */
  age?: number;
  absences: Array<{ startDate: Date; endDate: Date }>;
  /** ISO weekdays (1=Mon..7=Sun) this member's availability marks with zero slots. */
  unavailableWeekdays?: number[];
}

export interface PlannerTask {
  id: string;
  name: string;
  frequency: PlannerTaskFrequency;
  weight: number;
  minAge: number | null;
  estimatedMinutes: number | null;
  /** Optional until the schema column lands (S7.2); undefined means "not rotating". */
  isRotating?: boolean;
}

export interface PlannerPreference {
  memberId: string;
  taskId: string;
  preference: PlannerPreferenceType;
}

export interface PlannerRecentAssignment {
  taskId: string;
  memberId: string;
  dueDate: Date;
  status: PlannerAssignmentStatus;
  completedAt: Date | null;
}

export interface TaskPlannerSnapshot {
  members: PlannerMember[];
  tasks: PlannerTask[];
  preferences: PlannerPreference[];
  recentAssignments: PlannerRecentAssignment[];
}

export interface ScoreCandidate {
  memberId: string;
  memberName: string;
  score: number;
  reasons: string[];
}

export type AssignmentReasonCode = "PREFERENCE" | "ROTATION" | "LOWER_LOAD";

export interface PlannedAssignment {
  taskId: string;
  taskName: string;
  memberId: string;
  memberName: string;
  memberType: PlannerMemberType;
  dayOfWeek: number;
  dueDate: Date;
  reasonCode: AssignmentReasonCode;
  reason: string;
}

export interface PlanWeekResult {
  assignments: PlannedAssignment[];
  excludedTasks: PlannerExcludedTask[];
  notes: string[];
}

interface ScoreOptions {
  onlyAdults?: boolean;
}

/** ISO weekday (1=Mon..7=Sun) for a calendar date. */
function isoWeekday(date: Date): number {
  const jsDay = date.getDay(); // 0=Sun..6=Sat
  return jsDay === 0 ? 7 : jsDay;
}

function isAbsentOnDate(member: PlannerMember, date: Date): boolean {
  if (member.unavailableWeekdays?.includes(isoWeekday(date))) return true;

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  return member.absences.some((absence) => {
    const startDate = new Date(absence.startDate);
    const endDate = new Date(absence.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return checkDate >= startDate && checkDate <= endDate;
  });
}

function memberAge(member: PlannerMember): number {
  return member.age ?? FALLBACK_AGE_BY_TYPE[member.memberType];
}

/**
 * Extra pending-load counts to add on top of the snapshot's recentAssignments,
 * used by planWeek to reflect in-progress picks without mutating the snapshot.
 */
type LoadOverrides = Map<string, number>;

/**
 * Score every eligible member for a task on a given date (spec §2).
 *
 * Differences from the general CLAUDE.md description, kept exactly as today's
 * production algorithm behaves:
 * - Base score is 100, not a 0-100 scale; preference/load/recency are additive deltas.
 * - Recency bonus is `min(daysSinceLastCompleted, 14)`, and a member who never completed
 *   this task gets the same maximum bonus (+14), not an open-ended "longer is better".
 * - Capacity (ADULT 1.0 / TEEN 0.6 / CHILD 0.3) multiplies the *entire* score after all
 *   additive factors, not just the base — a teen's preference bonus is also scaled down.
 * - A minimum-age filter excludes members outright (not a score penalty); if it excludes
 *   everyone, callers retry with `{ onlyAdults: true }` instead of leaving the task unassigned.
 * - Absent members are excluded outright for the given date, never scored.
 */
export function scoreCandidates(
  task: PlannerTask,
  date: Date,
  snapshot: TaskPlannerSnapshot,
  now: Date,
  options?: ScoreOptions,
  loadOverrides?: LoadOverrides,
): ScoreCandidate[] {
  const candidateMembers = options?.onlyAdults
    ? snapshot.members.filter((m) => m.memberType === "ADULT")
    : snapshot.members;

  const scores: ScoreCandidate[] = [];

  for (const member of candidateMembers) {
    if (isAbsentOnDate(member, date)) continue;

    if (task.minAge !== null && memberAge(member) < task.minAge) continue;

    const reasons: string[] = [];
    let score = 100;

    const preference = snapshot.preferences.find(
      (p) => p.memberId === member.id && p.taskId === task.id,
    );
    if (preference?.preference === "PREFERRED") {
      score += 20;
      reasons.push("+20 tarea preferida");
    } else if (preference?.preference === "DISLIKED") {
      score -= 20;
      reasons.push("-20 tarea no deseada");
    }

    const pendingCount =
      snapshot.recentAssignments.filter(
        (a) => a.memberId === member.id && (a.status === "PENDING" || a.status === "IN_PROGRESS"),
      ).length + (loadOverrides?.get(member.id) ?? 0);
    const loadPenalty = pendingCount * 5;
    score -= loadPenalty;
    if (loadPenalty > 0) {
      reasons.push(`-${loadPenalty} por ${pendingCount} tareas pendientes`);
    }

    const completions = snapshot.recentAssignments.filter(
      (a) =>
        a.taskId === task.id &&
        a.memberId === member.id &&
        (a.status === "COMPLETED" || a.status === "VERIFIED") &&
        a.completedAt !== null,
    );
    const lastCompletedAt = completions.reduce<Date | null>((latest, a) => {
      if (!a.completedAt) return latest;
      return !latest || a.completedAt > latest ? a.completedAt : latest;
    }, null);

    if (lastCompletedAt) {
      const daysSince = Math.floor((now.getTime() - lastCompletedAt.getTime()) / (1000 * 60 * 60 * 24));
      const recencyBonus = Math.min(daysSince, 14);
      score += recencyBonus;
      if (recencyBonus > 0) {
        reasons.push(`+${recencyBonus} por ${daysSince} días sin esta tarea`);
      }
    } else {
      score += 14;
      reasons.push("+14 nunca ha hecho esta tarea");
    }

    const capacity = PLANNER_MEMBER_CAPACITY[member.memberType];
    score = Math.round(score * capacity);
    if (capacity < 1) {
      reasons.push(`×${capacity} capacidad ${member.memberType.toLowerCase()}`);
    }

    scores.push({ memberId: member.id, memberName: member.name, score, reasons });
  }

  // Deterministic tie-break: score desc, then memberId asc (today's code relied on
  // implicit Prisma row order for ties, which is not guaranteed — this makes it explicit).
  scores.sort((a, b) => b.score - a.score || a.memberId.localeCompare(b.memberId));

  return scores;
}

/**
 * Pick the best assignee for a task, retrying with adults-only when a minimum-age
 * filter excludes everyone (spec: "si tras filtrar por edad no queda nadie, usar solo adultos").
 */
export function pickNextAssignee(
  task: PlannerTask,
  date: Date,
  snapshot: TaskPlannerSnapshot,
  now: Date,
): ScoreCandidate | null {
  let scores = scoreCandidates(task, date, snapshot, now);
  if (scores.length === 0 && task.minAge !== null) {
    scores = scoreCandidates(task, date, snapshot, now, { onlyAdults: true });
  }
  return scores[0] ?? null;
}

/**
 * Pick the next assignee for an isRotating task's next occurrence: the member right
 * after `currentAssigneeId` in the stable id-sorted ring, skipping anyone absent on
 * `dueDate`. Returns null when the ring has no eligible member (caller falls back to
 * `pickNextAssignee`).
 */
export function pickNextRotationAssignee(
  task: PlannerTask,
  currentAssigneeId: string,
  dueDate: Date,
  snapshot: TaskPlannerSnapshot,
): ScoreCandidate | null {
  const rotationOrder = rotationOrderFor(task, snapshot);
  if (rotationOrder.length === 0) return null;

  const currentIndex = rotationOrder.indexOf(currentAssigneeId);
  const startOffset = currentIndex === -1 ? 0 : currentIndex + 1;

  const picked = pickRotationCandidate(rotationOrder, startOffset, 0, snapshot, dueDate);
  return picked?.candidate ?? null;
}

function buildAssignmentReason(reasonCode: AssignmentReasonCode): string {
  switch (reasonCode) {
    case "PREFERENCE":
      return "Lo marcó como preferida";
    case "ROTATION":
      return "Le toca por rotación";
    case "LOWER_LOAD":
      return "Tenía menos carga esta semana";
  }
}

function dayLabel(dayOfWeek: number): string {
  return DAY_LABELS_ES[dayOfWeek - 1] ?? DAY_LABELS_ES[0]!;
}

function dueDateForDay(startDate: Date, dayOfWeek: number): Date {
  const dueDate = new Date(startDate);
  dueDate.setDate(startDate.getDate() + dayOfWeek - 1);
  dueDate.setHours(23, 59, 59, 999);
  return dueDate;
}

/** Stable eligible-member order (minAge-passing, sorted by id) used as the rotation ring. */
function rotationOrderFor(task: PlannerTask, snapshot: TaskPlannerSnapshot): string[] {
  return snapshot.members
    .filter((m) => task.minAge === null || memberAge(m) >= task.minAge)
    .map((m) => m.id)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Where the rotation should start: the slot right after the most recent assignee of
 * this task (by dueDate, excluding CANCELLED history), so a WEEKLY/BIWEEKLY rotating
 * task actually advances between planning runs instead of always landing on the same
 * person. Falls back to the start of the id-sorted ring when there is no history.
 */
function rotationStartOffset(
  task: PlannerTask,
  rotationOrder: string[],
  snapshot: TaskPlannerSnapshot,
): number {
  if (rotationOrder.length === 0) return 0;

  const history = snapshot.recentAssignments.filter(
    (a) => a.taskId === task.id && a.status !== "CANCELLED",
  );
  if (history.length === 0) return 0;

  const latest = history.reduce((a, b) => (b.dueDate > a.dueDate ? b : a));
  const lastIndex = rotationOrder.indexOf(latest.memberId);
  if (lastIndex === -1) return 0;

  return (lastIndex + 1) % rotationOrder.length;
}

interface PickedCandidate {
  candidate: ScoreCandidate;
  reasonCode: AssignmentReasonCode;
}

/** Walk the rotation ring from `startOffset + occurrenceIndex`, skipping absent members. */
function pickRotationCandidate(
  rotationOrder: string[],
  startOffset: number,
  occurrenceIndex: number,
  snapshot: TaskPlannerSnapshot,
  dueDate: Date,
): PickedCandidate | null {
  for (let offset = 0; offset < rotationOrder.length; offset += 1) {
    const candidateId = rotationOrder[(startOffset + occurrenceIndex + offset) % rotationOrder.length];
    const member = snapshot.members.find((m) => m.id === candidateId);
    if (!member || isAbsentOnDate(member, dueDate)) continue;
    return { candidate: { memberId: member.id, memberName: member.name, score: 0, reasons: [] }, reasonCode: "ROTATION" };
  }
  return null;
}

/** Score-based pick with the adults-only retry, carrying the reason the winner was chosen. */
function pickScoredCandidate(
  task: PlannerTask,
  dueDate: Date,
  snapshot: TaskPlannerSnapshot,
  now: Date,
  loadOverrides: LoadOverrides,
): PickedCandidate | null {
  let scores = scoreCandidates(task, dueDate, snapshot, now, undefined, loadOverrides);
  if (scores.length === 0 && task.minAge !== null) {
    scores = scoreCandidates(task, dueDate, snapshot, now, { onlyAdults: true }, loadOverrides);
  }
  const candidate = scores[0];
  if (!candidate) return null;

  const preference = snapshot.preferences.find(
    (p) => p.memberId === candidate.memberId && p.taskId === task.id,
  );
  const reasonCode: AssignmentReasonCode = preference?.preference === "PREFERRED" ? "PREFERENCE" : "LOWER_LOAD";
  return { candidate, reasonCode };
}

/** Record every member absent on this date as a plan note (deduped by the caller's Set). */
function recordAbsenceNotes(
  snapshot: TaskPlannerSnapshot,
  dueDate: Date,
  dayOfWeek: number,
  notes: Set<string>,
): void {
  for (const member of snapshot.members) {
    if (isAbsentOnDate(member, dueDate)) {
      notes.add(`${member.name} no está el ${dayLabel(dayOfWeek)}`);
    }
  }
}

function compareLoadKeys(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/**
 * Build a full plan: assigns every included task's occurrences across the window.
 *
 * - DAILY tasks get one occurrence per day (1..min(durationDays, 7)).
 * - Every other frequency gets a single occurrence, placed on whichever day within the
 *   window minimizes (that day's load for the chosen member, that day's load for the
 *   whole household, day number) — so WEEKLY/BIWEEKLY/MONTHLY/ONCE tasks spread across
 *   the week instead of all landing on day 1.
 * - isRotating tasks alternate among eligible members in a stable (id-sorted) ring,
 *   continuing from the member after the task's most recent real assignee.
 * - Load is tracked in-memory (never mutating the snapshot) so later picks in the same
 *   plan see earlier picks' load.
 */
export function planWeek(params: {
  snapshot: TaskPlannerSnapshot;
  startDate: Date;
  durationDays: number;
  now: Date;
}): PlanWeekResult {
  const { snapshot, startDate, durationDays, now } = params;

  const { included, excluded } = partitionTasksByDuration(snapshot.tasks, durationDays);
  // Stable order: sort tasks by id so iteration (and thus load accumulation) is deterministic.
  const orderedTasks = [...included].sort((a, b) => a.id.localeCompare(b.id));
  const span = Math.min(durationDays, 7);

  const loadOverrides: LoadOverrides = new Map();
  const memberDayLoad = new Map<string, Map<number, number>>();
  const householdDayLoad = new Map<number, number>();
  const assignments: PlannedAssignment[] = [];
  const absenceNotes = new Set<string>();

  function recordAssignment(task: PlannerTask, dayOfWeek: number, dueDate: Date, picked: PickedCandidate): void {
    const member = snapshot.members.find((m) => m.id === picked.candidate.memberId);
    if (!member) return;

    assignments.push({
      taskId: task.id,
      taskName: task.name,
      memberId: member.id,
      memberName: member.name,
      memberType: member.memberType,
      dayOfWeek,
      dueDate,
      reasonCode: picked.reasonCode,
      reason: buildAssignmentReason(picked.reasonCode),
    });

    loadOverrides.set(member.id, (loadOverrides.get(member.id) ?? 0) + 1);
    const dayMap = memberDayLoad.get(member.id) ?? new Map<number, number>();
    dayMap.set(dayOfWeek, (dayMap.get(dayOfWeek) ?? 0) + 1);
    memberDayLoad.set(member.id, dayMap);
    householdDayLoad.set(dayOfWeek, (householdDayLoad.get(dayOfWeek) ?? 0) + 1);
  }

  for (const task of orderedTasks) {
    const rotationOrder = rotationOrderFor(task, snapshot);
    const startOffset = task.isRotating ? rotationStartOffset(task, rotationOrder, snapshot) : 0;

    if (task.frequency === "DAILY") {
      for (let occurrenceIndex = 0; occurrenceIndex < span; occurrenceIndex += 1) {
        const dayOfWeek = occurrenceIndex + 1;
        const dueDate = dueDateForDay(startDate, dayOfWeek);
        recordAbsenceNotes(snapshot, dueDate, dayOfWeek, absenceNotes);

        const picked =
          (task.isRotating && rotationOrder.length > 0
            ? pickRotationCandidate(rotationOrder, startOffset, occurrenceIndex, snapshot, dueDate)
            : null) ?? pickScoredCandidate(task, dueDate, snapshot, now, loadOverrides);

        if (!picked) continue;
        recordAssignment(task, dayOfWeek, dueDate, picked);
      }
      continue;
    }

    // Single occurrence: search every day in the window for the least-loaded placement.
    let best: { dayOfWeek: number; dueDate: Date; picked: PickedCandidate } | null = null;
    let bestKey: [number, number, number] | null = null;

    for (let dayOfWeek = 1; dayOfWeek <= span; dayOfWeek += 1) {
      const dueDate = dueDateForDay(startDate, dayOfWeek);
      recordAbsenceNotes(snapshot, dueDate, dayOfWeek, absenceNotes);

      const picked =
        (task.isRotating && rotationOrder.length > 0
          ? pickRotationCandidate(rotationOrder, startOffset, 0, snapshot, dueDate)
          : null) ?? pickScoredCandidate(task, dueDate, snapshot, now, loadOverrides);

      if (!picked) continue;

      const memberDayCount = memberDayLoad.get(picked.candidate.memberId)?.get(dayOfWeek) ?? 0;
      const householdCount = householdDayLoad.get(dayOfWeek) ?? 0;
      const key: [number, number, number] = [memberDayCount, householdCount, dayOfWeek];

      if (!bestKey || compareLoadKeys(key, bestKey) < 0) {
        bestKey = key;
        best = { dayOfWeek, dueDate, picked };
      }
    }

    if (best) {
      recordAssignment(task, best.dayOfWeek, best.dueDate, best.picked);
    }
  }

  return {
    assignments,
    excludedTasks: excluded.map((t) => ({ taskName: t.name, frequency: t.frequency })),
    notes: [...absenceNotes].slice(0, MAX_ABSENCE_NOTES),
  };
}
