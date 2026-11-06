import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Composer } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { useAnotarParse } from "@/hooks/use-anotar-parse";
import {
  buildExpenseDraft,
  buildTaskDraft,
  resolveMemberIdByName,
  todayIsoDate,
} from "@/lib/anotar-draft-logic";
import { AnotarExpensePreview } from "./anotar-expense-preview";
import { AnotarTaskPreview } from "./anotar-task-preview";
import { AnotarItemPreview } from "./anotar-item-preview";
import { AnotarUnknown } from "./anotar-unknown";
import type { AnotarKind } from "./anotar-unknown";
import type { ThemeColors } from "@/theme";
import type { MemberSummary, ParseEntryResponse } from "@habita/contracts";
import type { AnotarSaveInput } from "@/hooks/use-anotar-save";
import type { AnotarClassicReason } from "./anotar-classic-form";
import type { ExpenseDraft, ItemDraftEntry, TaskDraft } from "@/lib/anotar-draft-logic";

interface AnotarAutoFlowProps {
  text: string;
  onChangeText: (text: string) => void;
  members: MemberSummary[];
  currentMemberId: string | null;
  isSaving: boolean;
  onSave: (input: AnotarSaveInput) => Promise<void>;
  onSaved: (kind: AnotarKind) => void;
  onSwitchToClassic: (kind: AnotarKind, reason: AnotarClassicReason) => void;
}

type AnotarResultState =
  | { kind: "unknown" }
  | { kind: "expense"; draft: ExpenseDraft; date: string }
  | { kind: "task"; draft: TaskDraft }
  | { kind: "item"; items: ItemDraftEntry[] }
  | null;

/** Composer + live preview — the default Anotar flow while the AI is reachable (handoff §5.3 Global). */
export function AnotarAutoFlow({
  text,
  onChangeText,
  members,
  currentMemberId,
  isSaving,
  onSave,
  onSaved,
  onSwitchToClassic,
}: AnotarAutoFlowProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [resultState, setResultState] = useState<AnotarResultState>(null);

  const handleResult = useCallback(
    (result: ParseEntryResponse) => {
      if (result.kind === "unknown") {
        setResultState({ kind: "unknown" });
        return;
      }
      if (result.kind === "expense") {
        if (!currentMemberId) return; // members still loading — the composer stays usable, preview waits
        const draft = buildExpenseDraft(
          {
            title: result.expense.title,
            amount: result.expense.amount,
            category: result.expense.category,
            paidByMemberId: result.expense.paidByMemberId ?? resolveMemberIdByName(result.expense.paidByName, members),
            splitWithMemberIds:
              result.expense.splitWithMemberIds.length > 0
                ? result.expense.splitWithMemberIds
                : result.expense.splitWithNames
                    .map((name) => resolveMemberIdByName(name, members))
                    .filter((id): id is string => id !== null),
          },
          members,
          currentMemberId,
        );
        const date = result.expense.date && /^\d{4}-\d{2}-\d{2}$/.test(result.expense.date) ? result.expense.date : todayIsoDate();
        setResultState({ kind: "expense", draft, date });
        return;
      }
      if (result.kind === "task") {
        const draft = buildTaskDraft({
          name: result.task.name,
          frequency: result.task.frequency,
          dueDate: result.task.dueDate,
          assigneeMemberId: result.task.assigneeMemberId ?? resolveMemberIdByName(result.task.assigneeName, members),
        });
        setResultState({ kind: "task", draft });
        return;
      }
      setResultState({ kind: "item", items: result.items });
    },
    [members, currentMemberId],
  );

  const { status, parseNow } = useAnotarParse(text, true, { onResult: handleResult });

  return (
    <>
      <Composer value={text} onChangeText={onChangeText} onSubmit={() => parseNow(text)} placeholder="Anotá un gasto, tarea o ítem…" />

      {status === "parsing" ? <Text style={styles.hint}>Pensando…</Text> : null}
      {status === "rate_limited" ? <Text style={styles.hint}>Esperá un momento para seguir interpretando</Text> : null}

      {resultState?.kind === "unknown" ? <AnotarUnknown onPick={(kind) => onSwitchToClassic(kind, "manual")} /> : null}

      {resultState?.kind === "expense" ? (
        <AnotarExpensePreview
          draft={resultState.draft}
          date={resultState.date}
          onChangeDraft={(next) =>
            setResultState((prev) => (prev?.kind === "expense" ? { ...prev, draft: { ...prev.draft, ...next } } : prev))
          }
          onChangeDate={(date) => setResultState((prev) => (prev?.kind === "expense" ? { ...prev, date } : prev))}
          members={members}
          currentMemberId={currentMemberId}
          isSaving={isSaving}
          onSave={onSave}
          onSaved={() => onSaved("expense")}
        />
      ) : null}

      {resultState?.kind === "task" ? (
        <AnotarTaskPreview
          draft={resultState.draft}
          onChangeDraft={(next) => setResultState((prev) => (prev?.kind === "task" ? { ...prev, draft: { ...prev.draft, ...next } } : prev))}
          members={members}
          isSaving={isSaving}
          onSave={onSave}
          onSaved={() => onSaved("task")}
        />
      ) : null}

      {resultState?.kind === "item" ? (
        <AnotarItemPreview
          items={resultState.items}
          onChangeItems={(items) => setResultState((prev) => (prev?.kind === "item" ? { ...prev, items } : prev))}
          isSaving={isSaving}
          onSave={onSave}
          onSaved={() => onSaved("item")}
        />
      ) : null}
    </>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    hint: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
      marginTop: spacing.sm,
    },
  });
}
