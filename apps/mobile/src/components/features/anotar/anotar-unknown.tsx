import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";

export type AnotarKind = "expense" | "task" | "item";

interface AnotarUnknownProps {
  onPick: (kind: AnotarKind) => void;
}

/** §5.3 Global "Anotar" — the AI understood the text but couldn't classify it. */
export function AnotarUnknown({ onPick }: AnotarUnknownProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.message}>No entendí qué querés anotar</Text>
      <View style={styles.actions}>
        <Button label="Gasto" variant="secondary" size="sm" onPress={() => onPick("expense")} />
        <Button label="Tarea" variant="secondary" size="sm" onPress={() => onPick("task")} />
        <Button label="Compra" variant="secondary" size="sm" onPress={() => onPick("item")} />
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
      paddingTop: spacing.sm,
    },
    message: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 14,
      color: c.ink2,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
    },
  });
}
