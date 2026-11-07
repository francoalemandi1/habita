"use client";

import { SegmentedControl } from "@/components/ds/segmented-control";
import { AnotarExpensePreview } from "./anotar-expense-preview";
import { AnotarTaskPreview } from "./anotar-task-preview";
import { AnotarItemPreview } from "./anotar-item-preview";

import type { MemberSummary } from "@habita/contracts";
import type { ExpenseDraft, ItemDraft, TaskDraft } from "./anotar-draft-types";

export type ClassicKind = "expense" | "task" | "item";

const KIND_OPTIONS: Array<{ value: ClassicKind; label: string }> = [
  { value: "expense", label: "Gasto" },
  { value: "task", label: "Tarea" },
  { value: "item", label: "Compra" },
];

interface AnotarClassicFormProps {
  kind: ClassicKind;
  onKindChange: (kind: ClassicKind) => void;
  expenseDraft: ExpenseDraft;
  onExpenseChange: (next: ExpenseDraft) => void;
  taskDraft: TaskDraft;
  onTaskChange: (next: TaskDraft) => void;
  itemDrafts: ItemDraft[];
  onItemsChange: (next: ItemDraft[]) => void;
  members: MemberSummary[];
  currentMemberId: string;
  showAiUnavailableHint: boolean;
}

/**
 * The same fields as the AI preview cards, filled by hand (handoff §5.3) —
 * reached when the AI is unavailable, rate-limited, or couldn't classify the text.
 */
export function AnotarClassicForm({
  kind,
  onKindChange,
  expenseDraft,
  onExpenseChange,
  taskDraft,
  onTaskChange,
  itemDrafts,
  onItemsChange,
  members,
  currentMemberId,
  showAiUnavailableHint,
}: AnotarClassicFormProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl options={KIND_OPTIONS} value={kind} onChange={onKindChange} />
      {showAiUnavailableHint && <p className="text-[13px] text-ink-3">Sin IA por ahora · completalo a mano</p>}

      {kind === "expense" && (
        <AnotarExpensePreview draft={expenseDraft} onChange={onExpenseChange} members={members} currentMemberId={currentMemberId} />
      )}
      {kind === "task" && <AnotarTaskPreview draft={taskDraft} onChange={onTaskChange} members={members} />}
      {kind === "item" && <AnotarItemPreview drafts={itemDrafts} onChange={onItemsChange} />}
    </div>
  );
}
