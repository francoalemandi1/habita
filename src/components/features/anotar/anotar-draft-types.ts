import type {
  ExpenseCategory,
  MemberSummary,
  ParsedExpenseEntry,
  ParsedItemEntry,
  ParsedTaskEntry,
  TaskFrequency,
} from "@habita/contracts";

export interface ExpenseDraft {
  title: string;
  amount: number;
  category: ExpenseCategory;
  payerId: string;
  participantIds: string[];
  /** yyyy-mm-dd */
  date: string;
}

export interface TaskDraft {
  name: string;
  assigneeId: string | null;
  /** yyyy-mm-dd, null when unset */
  dueDate: string | null;
  frequency: TaskFrequency;
}

export interface ItemDraft {
  name: string;
  quantity: number;
}

/** yyyy-mm-dd in the browser's local timezone — the household-local proxy available on web. */
export function todayIsoDate(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

/** Defaults to the parsed payer + split-with; falls back to every active member, equal split. */
export function buildExpenseDraftFromParsed(
  parsed: ParsedExpenseEntry,
  members: MemberSummary[],
  currentMemberId: string,
): ExpenseDraft {
  const payerId = parsed.paidByMemberId ?? currentMemberId;
  const activeIds = members.map((member) => member.id);
  const participantIds =
    parsed.splitWithMemberIds.length > 0 ? [...new Set([...parsed.splitWithMemberIds, payerId])] : activeIds;

  return {
    title: parsed.title,
    amount: parsed.amount,
    category: parsed.category,
    payerId,
    participantIds,
    date: parsed.date ?? todayIsoDate(),
  };
}

export function buildTaskDraftFromParsed(parsed: ParsedTaskEntry): TaskDraft {
  return { name: parsed.name, assigneeId: parsed.assigneeMemberId, dueDate: parsed.dueDate, frequency: parsed.frequency };
}

export function buildItemDraftsFromParsed(parsed: ParsedItemEntry[]): ItemDraft[] {
  return parsed.map((item) => ({ name: item.name, quantity: item.quantity }));
}

export function defaultExpenseDraft(members: MemberSummary[], currentMemberId: string, title = ""): ExpenseDraft {
  return {
    title,
    amount: 0,
    category: "OTHER",
    payerId: currentMemberId,
    participantIds: members.map((member) => member.id),
    date: todayIsoDate(),
  };
}

export function defaultTaskDraft(name = ""): TaskDraft {
  return { name, assigneeId: null, dueDate: null, frequency: "WEEKLY" };
}

export function defaultItemDrafts(name = ""): ItemDraft[] {
  return [{ name, quantity: 1 }];
}

/** Pause after typing before parsing (handoff §5.3: live parse without a request per keystroke). */
export const ANOTAR_PARSE_DEBOUNCE_MS = 700;

export const ANOTAR_CTA_LABELS = {
  expense: { label: "Guardar gasto", saving: "Guardando" },
  task: { label: "Guardar tarea", saving: "Guardando" },
  item: { label: "Sumar a la lista", saving: "Sumando" },
} as const;
