import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chip, RadioGroup, TextField } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { expenseCategorySchema } from "@habita/contracts";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/anotar-draft-logic";
import type { ThemeColors } from "@/theme";
import type { MemberSummary } from "@habita/contracts";
import type { ExpenseDraft } from "@/lib/anotar-draft-logic";

export type AnotarExpenseField = "category" | "payer" | "split" | "date";

interface AnotarExpenseFieldEditorProps {
  field: AnotarExpenseField;
  draft: ExpenseDraft;
  members: MemberSummary[];
  date: string;
  onChangeDraft: (next: Partial<ExpenseDraft>) => void;
  onChangeDate: (next: string) => void;
  onDone: () => void;
}

const CATEGORY_OPTIONS = expenseCategorySchema.options.map((value) => ({
  value,
  label: EXPENSE_CATEGORY_LABELS[value],
}));

/** Field picker rendered inside the Anotar sheet — never a stacked sheet (handoff §7 pattern B). */
export function AnotarExpenseFieldEditor({
  field,
  draft,
  members,
  date,
  onChangeDraft,
  onChangeDate,
  onDone,
}: AnotarExpenseFieldEditorProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const toggleParticipant = (memberId: string) => {
    if (memberId === draft.payerId) return;
    const next = draft.participantIds.includes(memberId)
      ? draft.participantIds.filter((id) => id !== memberId)
      : [...draft.participantIds, memberId];
    onChangeDraft({ participantIds: next });
  };

  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" onPress={onDone} hitSlop={8}>
        <Text style={styles.back}>Listo</Text>
      </Pressable>

      {field === "category" && (
        <RadioGroup
          accessibilityLabel="Categoría"
          options={CATEGORY_OPTIONS}
          value={draft.category}
          onValueChange={(category) => onChangeDraft({ category })}
        />
      )}

      {field === "payer" && (
        <RadioGroup
          accessibilityLabel="Quién pagó"
          options={members.map((m) => ({ value: m.id, label: m.name }))}
          value={draft.payerId}
          onValueChange={(payerId) => {
            const participantIds = draft.participantIds.includes(payerId)
              ? draft.participantIds
              : [...draft.participantIds, payerId];
            onChangeDraft({ payerId, participantIds });
          }}
        />
      )}

      {field === "split" && (
        <View style={styles.splitRow}>
          {members.map((m) => {
            const active = draft.participantIds.includes(m.id);
            return (
              <Chip
                key={m.id}
                label={m.name}
                tone={active ? "filterOn" : "filterOff"}
                onPress={() => toggleParticipant(m.id)}
              />
            );
          })}
        </View>
      )}

      {field === "date" && (
        <TextField
          label="Fecha (YYYY-MM-DD)"
          value={date}
          onChangeText={onChangeDate}
          autoCapitalize="none"
        />
      )}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
      paddingTop: spacing.sm,
    },
    back: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 15,
      color: c.monte,
      alignSelf: "flex-end",
    },
    splitRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
  });
}
