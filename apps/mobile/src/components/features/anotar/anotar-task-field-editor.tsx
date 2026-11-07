import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RadioGroup, TextField } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { taskFrequencySchema } from "@habita/contracts";
import { TASK_FREQUENCY_LABELS } from "@/lib/anotar-draft-logic";
import type { ThemeColors } from "@/theme";
import type { MemberSummary } from "@habita/contracts";
import type { TaskDraft } from "@/lib/anotar-draft-logic";

export type AnotarTaskField = "assignee" | "dueDate" | "frequency";

/** Sentinel radio value for "Que lo decida el reparto" — RadioGroup requires a string. */
const DECIDE_LATER = "";

interface AnotarTaskFieldEditorProps {
  field: AnotarTaskField;
  draft: TaskDraft;
  members: MemberSummary[];
  onChangeDraft: (next: Partial<TaskDraft>) => void;
  onDone: () => void;
}

const FREQUENCY_OPTIONS = taskFrequencySchema.options.map((value) => ({
  value,
  label: TASK_FREQUENCY_LABELS[value],
}));

export function AnotarTaskFieldEditor({
  field,
  draft,
  members,
  onChangeDraft,
  onDone,
}: AnotarTaskFieldEditorProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const assigneeOptions = [
    { value: DECIDE_LATER, label: "Que lo decida el reparto" },
    ...members.map((m) => ({ value: m.id, label: m.name })),
  ];

  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" onPress={onDone} hitSlop={8}>
        <Text style={styles.back}>Listo</Text>
      </Pressable>

      {field === "assignee" && (
        <RadioGroup
          accessibilityLabel="Asignar a"
          options={assigneeOptions}
          value={draft.assigneeId ?? DECIDE_LATER}
          onValueChange={(value) => onChangeDraft({ assigneeId: value === DECIDE_LATER ? null : value })}
        />
      )}

      {field === "dueDate" && (
        <TextField
          label="Vencimiento (YYYY-MM-DD)"
          value={draft.dueDate}
          onChangeText={(dueDate) => onChangeDraft({ dueDate })}
          autoCapitalize="none"
        />
      )}

      {field === "frequency" && (
        <RadioGroup
          accessibilityLabel="Frecuencia"
          options={FREQUENCY_OPTIONS}
          value={draft.frequency}
          onValueChange={(frequency) => onChangeDraft({ frequency })}
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
  });
}
