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
}

export interface TaskDraft {
  name: string;
  frequency: TaskFrequency;
  /** YYYY-MM-DD, editable in the chip. */
  dueDate: string;
  /** null → "Que lo decida el reparto". */
  assigneeId: string | null;
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

  return { title: parsed.title, amount: parsed.amount, category: parsed.category, payerId, participantIds };
}

export function buildTaskDraft(
  parsed: { name: string; frequency: TaskFrequency; dueDate: string | null; assigneeMemberId: string | null },
): TaskDraft {
  return {
    name: parsed.name,
    frequency: parsed.frequency,
    dueDate: parsed.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate) ? parsed.dueDate : todayIsoDate(),
    assigneeId: parsed.assigneeMemberId,
  };
}

/** EQUAL split server-side always divides among every active member — use CUSTOM to honor a subset. */
export function buildExpensePayload(draft: ExpenseDraft): CreateExpenseInput {
  return {
    title: draft.title,
    amount: draft.amount,
    category: draft.category,
    paidById: draft.payerId,
    splitType: "CUSTOM",
    splits: splitEvenlyExact(draft.amount, draft.participantIds),
  };
}
