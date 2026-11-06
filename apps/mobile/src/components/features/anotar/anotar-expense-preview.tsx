import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Button, Chip } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { describeExpenseConsequence, formatExpenseConsequence } from "@habita/domain";
import { formatCurrencyArs } from "@/lib/plata-money-saldos";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { EXPENSE_CATEGORY_LABELS, buildExpensePayload, dueDateToIsoStartOfDay } from "@/lib/anotar-draft-logic";
import { AnotarExpenseFieldEditor } from "./anotar-expense-field-editor";
import type { AnotarExpenseField } from "./anotar-expense-field-editor";
import type { ThemeColors } from "@/theme";
import type { MemberSummary } from "@habita/contracts";
import type { AnotarSaveInput } from "@/hooks/use-anotar-save";
import type { ExpenseDraft } from "@/lib/anotar-draft-logic";

interface AnotarExpensePreviewProps {
  draft: ExpenseDraft;
  date: string;
  onChangeDraft: (next: Partial<ExpenseDraft>) => void;
  onChangeDate: (next: string) => void;
  members: MemberSummary[];
  currentMemberId: string | null;
  isSaving: boolean;
  onSave: (input: AnotarSaveInput) => Promise<boolean>;
  onSaved: (wasQueued: boolean) => void;
}

/** §6.22 Composer preview — expense card with editable chips (handoff §5.3 Global). Controlled by the parent. */
export function AnotarExpensePreview({
  draft,
  date,
  onChangeDraft,
  onChangeDate,
  members,
  currentMemberId,
  isSaving,
  onSave,
  onSaved,
}: AnotarExpensePreviewProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [editingField, setEditingField] = useState<AnotarExpenseField | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nameByMemberId = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);
  const consequence = currentMemberId
    ? formatExpenseConsequence(
        describeExpenseConsequence({
          amount: draft.amount,
          payerMemberId: draft.payerId,
          participantMemberIds: draft.participantIds,
          currentMemberId,
          nameByMemberId,
        }),
        formatCurrencyArs,
      )
    : null;

  const payerName = draft.payerId === currentMemberId ? "Vos" : nameByMemberId.get(draft.payerId) ?? "—";

  const handleSave = async () => {
    setError(null);
    try {
      const payload = { ...buildExpensePayload(draft), date: dueDateToIsoStartOfDay(date) ?? undefined };
      const wasQueued = await onSave({ kind: "expense", payload });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved(wasQueued);
    } catch (saveError) {
      setError(getMobileErrorMessage(saveError));
    }
  };

  if (editingField) {
    return (
      <AnotarExpenseFieldEditor
        field={editingField}
        draft={draft}
        members={members}
        date={date}
        onChangeDraft={onChangeDraft}
        onChangeDate={onChangeDate}
        onDone={() => setEditingField(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Chip label="Gasto" tone="onDay" />
      <Text style={styles.title}>{draft.title}</Text>
      <Text style={styles.amount}>{formatCurrencyArs(draft.amount)}</Text>

      <View style={styles.chipsRow}>
        <Chip label={EXPENSE_CATEGORY_LABELS[draft.category]} tone="filterOff" onPress={() => setEditingField("category")} />
        <Chip label={`Pagó ${payerName}`} tone="filterOff" onPress={() => setEditingField("payer")} />
        <Chip label={`Entre ${draft.participantIds.length}`} tone="filterOff" onPress={() => setEditingField("split")} />
        <Chip label={date} tone="filterOff" onPress={() => setEditingField("date")} />
      </View>

      {consequence ? <Text style={styles.consequence}>{consequence}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Guardar gasto"
        loadingLabel="Guardando"
        loading={isSaving}
        disabled={!currentMemberId}
        onPress={() => void handleSave()}
      />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    title: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 16,
      color: c.ink,
    },
    amount: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 24,
      color: c.ink,
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    consequence: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
    error: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ladrilloText,
    },
  });
}
