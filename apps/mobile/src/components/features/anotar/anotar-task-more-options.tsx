import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { Stepper, TextField, Toggle } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";

export type AnotarTaskMoreOptionsFields = "description" | "weight" | "isRotating";

interface AnotarTaskMoreOptionsDraft {
  description: string;
  weight: number;
  isRotating: boolean;
}

interface AnotarTaskMoreOptionsProps {
  draft: AnotarTaskMoreOptionsDraft;
  onChange: (next: Partial<Pick<AnotarTaskMoreOptionsDraft, AnotarTaskMoreOptionsFields>>) => void;
}

/** §5.3 Global "Anotar" — collapsed "Más opciones": descripción, peso, rotación. */
export function AnotarTaskMoreOptions({ draft, onChange }: AnotarTaskMoreOptionsProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" onPress={() => setExpanded((current) => !current)} style={styles.toggleRow} hitSlop={8}>
        {expanded ? <ChevronUp size={14} color={colors.ink2} /> : <ChevronDown size={14} color={colors.ink2} />}
        <Text style={styles.toggleLabel}>Más opciones</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.content}>
          <TextField
            label="Descripción"
            value={draft.description}
            onChangeText={(description) => onChange({ description: description.slice(0, 500) })}
            multiline
            numberOfLines={2}
          />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Peso</Text>
            <Stepper value={draft.weight} onValueChange={(weight) => onChange({ weight })} min={1} max={5} accessibilityLabel="Peso" />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Rota entre miembros</Text>
            <Toggle value={draft.isRotating} onValueChange={(isRotating) => onChange({ isRotating })} accessibilityLabel="Rota entre miembros" />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { gap: spacing.sm },
    toggleRow: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
    toggleLabel: { fontFamily: fontFamilyForWeight(600), fontSize: 13, color: c.ink2 },
    content: { gap: spacing.md },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    rowLabel: { fontFamily: fontFamilyForWeight(400), fontSize: 14, color: c.ink },
  });
}
