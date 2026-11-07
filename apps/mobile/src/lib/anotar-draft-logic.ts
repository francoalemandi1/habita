import { splitEvenlyExact } from "@habita/domain";

import type {
  CreateExpenseInput,
  ExpenseCategory,
  MemberSummary,
  TaskFrequency,
} from "@habita/contracts";

/** §5.3 Global "Anotar" — pure helpers turning a parsed/edited draft into API payloads. */

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  GROCERIES: "Supermercado",
  FOOD: "Comida",
  UTILITIES: "Servicios",
  TRANSPORT: "Transporte",
  HEALTH: "Salud",
  HOME: "Hogar",
  RENT: "Alquiler",
  ENTERTAINMENT: "Entretenimiento",
  EDUCATION: "Educación",
  OTHER: "Otros",
};

/** Anotar never asks for a task's weight — every task it creates starts at the lightest weight. */
export const DEFAULT_TASK_WEIGHT = 1;

export const TASK_FREQUENCY_LABELS: Record<TaskFrequency, string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  ONCE: "Una vez",
};

export interface ExpenseDraft {
  title: string;
  amount: number;
  category: ExpenseCategory;
  payerId: string;
  /** Who shares the expense, payer included. */
  participantIds: string[];
  splitType: "EQUAL" | "CUSTOM";
  /** memberId -> typed amount, only used when splitType is CUSTOM. */
  customSplits: Record<string, string>;
  /** null — user hasn't touched it; resolved with `resolveChargeToFund` at display/save time. */
  chargeToFund: boolean | null;
  notes: string;
}

export interface TaskDraft {
  name: string;
  frequency: TaskFrequency;
  /** YYYY-MM-DD, editable in the chip. */
  dueDate: string;
  /** null → "Que lo decida el reparto". */
  assigneeId: string | null;
  description: string;
  /** 1-5 */
  weight: number;
  isRotating: boolean;
}

export interface ItemDraftEntry {
  name: string;
  quantity: number;
}

/** Case-insensitive name match against the household's members (AI returns names, not ids, when unsure). */
export function resolveMemberIdByName(name: string | null, members: MemberSummary[]): string | null {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  return members.find((member) => member.name.trim().toLowerCase() === normalized)?.id ?? null;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** YYYY-MM-DD → ISO datetime at a fixed hour, or null if malformed. */
export function dueDateToIsoStartOfDay(dateValue: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const parsed = new Date(`${dateValue}T09:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Splits a total into integer-cent shares that sum back exactly to the total,
 * mirroring the server's `splitEqually` (src/lib/expense-splits.ts) so the
 * CUSTOM payload this builds is always accepted.
 */
export function buildExpenseDraft(
  parsed: {
    title: string;
    amount: number;
    category: ExpenseCategory;
    paidByMemberId: string | null;
    splitWithMemberIds: string[];
  },
  activeMembers: MemberSummary[],
  currentMemberId: string,
): ExpenseDraft {
  const payerId = parsed.paidByMemberId ?? currentMemberId;
  const parsedParticipants = parsed.splitWithMemberIds.length > 0
    ? parsed.splitWithMemberIds
    : activeMembers.map((member) => member.id);
  const participantIds = parsedParticipants.includes(payerId)
    ? parsedParticipants
    : [...parsedParticipants, payerId];

  return {
    title: parsed.title,
    amount: parsed.amount,
    category: parsed.category,
    payerId,
    participantIds,
    splitType: "EQUAL",
    customSplits: {},
    chargeToFund: null,
    notes: "",
  };
}

export function buildTaskDraft(
  parsed: { name: string; frequency: TaskFrequency; dueDate: string | null; assigneeMemberId: string | null },
): TaskDraft {
  return {
    name: parsed.name,
    frequency: parsed.frequency,
    dueDate: parsed.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate) ? parsed.dueDate : todayIsoDate(),
    assigneeId: parsed.assigneeMemberId,
    description: "",
    weight: DEFAULT_TASK_WEIGHT,
    isRotating: false,
  };
}

const SPLIT_SUM_TOLERANCE = 0.01;

export interface CustomSplitSummary {
  assignedTotal: number;
  remaining: number;
  isBalanced: boolean;
  isOver: boolean;
}

/** How much of `amount` is still unassigned across a custom per-member split. */
export function summarizeCustomSplit(
  amount: number,
  customSplits: Record<string, string>,
  participantIds: string[],
): CustomSplitSummary {
  const assignedTotal = participantIds.reduce((sum, id) => sum + (parseFloat(customSplits[id] ?? "0") || 0), 0);
  const remaining = Math.round((amount - assignedTotal) * 100) / 100;
  return {
    assignedTotal,
    remaining,
    isBalanced: Math.abs(remaining) < SPLIT_SUM_TOLERANCE,
    isOver: remaining < -SPLIT_SUM_TOLERANCE,
  };
}

export type CustomSplitTone = "balanced" | "over" | "under";

/** Status line under the custom split: whether the amounts add up, and by how much they miss. */
export function describeCustomSplit(summary: CustomSplitSummary): { tone: CustomSplitTone; label: string } {
  if (summary.isBalanced) return { tone: "balanced", label: "Montos correctos" };
  const gap = Math.abs(summary.remaining).toLocaleString("es-AR", { maximumFractionDigits: 2 });
  if (summary.isOver) return { tone: "over", label: `$${gap} de más` };
  return { tone: "under", label: `$${gap} por asignar` };
}

export interface FundForVisibility {
  isActive: boolean;
  fundCategories: readonly string[];
}

/** The fund toggle only shows when the household fund is active and covers this category. */
export function isFundToggleVisible(fund: FundForVisibility | null | undefined, category: ExpenseCategory): boolean {
  if (!fund?.isActive) return false;
  return fund.fundCategories.includes(category);
}

/**
 * `null` means the user hasn't touched the toggle yet — it follows the fund's
 * default (on, matching the old screen's auto-on behavior) as long as the
 * toggle is actually visible. An explicit `true`/`false` always wins, and the
 * toggle never resolves true when it isn't shown (no fund, inactive, or an
 * unmatched/unknown category — including while the fund is still loading).
 */
export function resolveChargeToFund(choice: boolean | null, isToggleVisible: boolean): boolean {
  if (!isToggleVisible) return false;
  return choice ?? true;
}

/**
 * EQUAL split server-side always divides among every active member — use CUSTOM to honor a
 * subset. `resolvedChargeToFund` is the already-resolved value (see `resolveChargeToFund`);
 * this function has no fund context of its own.
 */
export function buildExpensePayload(draft: ExpenseDraft, resolvedChargeToFund: boolean): CreateExpenseInput {
  const splits =
    draft.splitType === "CUSTOM"
      ? draft.participantIds.map((memberId) => ({ memberId, amount: parseFloat(draft.customSplits[memberId] ?? "0") || 0 }))
      : splitEvenlyExact(draft.amount, draft.participantIds);

  return {
    title: draft.title,
    amount: draft.amount,
    category: draft.category,
    paidById: draft.payerId,
    splitType: "CUSTOM",
    splits,
    notes: draft.notes.trim() || undefined,
    chargeToFund: resolvedChargeToFund || undefined,
  };
}
