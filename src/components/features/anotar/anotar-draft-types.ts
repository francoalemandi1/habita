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
  splitType: "EQUAL" | "CUSTOM";
  /** memberId -> typed amount, only used when splitType is CUSTOM. */
  customSplits: Record<string, string>;
  /** null — user hasn't touched it; resolved with `resolveChargeToFund` at display/save time. */
  chargeToFund: boolean | null;
  notes: string;
}

export interface TaskDraft {
  name: string;
  assigneeId: string | null;
  /** yyyy-mm-dd, null when unset */
  dueDate: string | null;
  frequency: TaskFrequency;
  description: string;
  /** 1-5 */
  weight: number;
  isRotating: boolean;
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
    splitType: "EQUAL",
    customSplits: {},
    chargeToFund: null,
    notes: "",
  };
}

export function buildTaskDraftFromParsed(parsed: ParsedTaskEntry): TaskDraft {
  return {
    name: parsed.name,
    assigneeId: parsed.assigneeMemberId,
    dueDate: parsed.dueDate,
    frequency: parsed.frequency,
    description: "",
    weight: 2,
    isRotating: false,
  };
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
    splitType: "EQUAL",
    customSplits: {},
    chargeToFund: null,
    notes: "",
  };
}

export function defaultTaskDraft(name = ""): TaskDraft {
  return { name, assigneeId: null, dueDate: null, frequency: "WEEKLY", description: "", weight: 2, isRotating: false };
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

export type AnotarSaveKind = "expense" | "task" | "item";

/**
 * Resolves the sheet's current mode + classic-form kind to the kind that would
 * actually be saved, or `null` when there's nothing to save yet (idle/unknown) —
 * the CTA is hidden and the save flow is a no-op in that case.
 */
export function resolveAnotarSaveKind(
  mode: "idle" | "expense" | "task" | "item" | "unknown" | "classic",
  classicKind: AnotarSaveKind,
): AnotarSaveKind | null {
  if (mode === "classic") return classicKind;
  if (mode === "expense" || mode === "task" || mode === "item") return mode;
  return null;
}
