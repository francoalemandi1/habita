import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { RadioGroup, TextField } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";
import type { MemberSummary } from "@habita/contracts";

const DECIDE_LATER = "";

export interface ClassicTaskState {
  name: string;
  assigneeId: string | null;
  date: string;
}

interface AnotarClassicTaskFieldsProps {
  state: ClassicTaskState;
  members: MemberSummary[];
  onChange: (next: Partial<ClassicTaskState>) => void;
}

export function AnotarClassicTaskFields({ state, members, onChange }: AnotarClassicTaskFieldsProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const assigneeOptions = [
    { value: DECIDE_LATER, label: "Que lo decida el reparto" },
    ...members.map((m) => ({ value: m.id, label: m.name })),
  ];

  return (
    <View style={styles.container}>
      <TextField label="Nombre" value={state.name} onChangeText={(name) => onChange({ name })} />

      <Text style={styles.sectionLabel}>Asignar a</Text>
      <RadioGroup
        accessibilityLabel="Asignar a"
        options={assigneeOptions}
        value={state.assigneeId ?? DECIDE_LATER}
        onValueChange={(value) => onChange({ assigneeId: value === DECIDE_LATER ? null : value })}
      />

      <TextField label="Vencimiento (YYYY-MM-DD)" value={state.date} onChangeText={(date) => onChange({ date })} autoCapitalize="none" />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
    },
    sectionLabel: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 13,
      color: c.ink,
    },
  });
}
