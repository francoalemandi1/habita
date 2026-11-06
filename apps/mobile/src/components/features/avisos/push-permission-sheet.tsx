import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Sheet } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

export interface PushPermissionSheetProps {
  visible: boolean;
  onActivate: () => void;
  onDismiss: () => void;
}

/** §7 "Permiso de push" — our own sheet, asked the first time someone passes a task. */
export function PushPermissionSheet({ visible, onActivate, onDismiss }: PushPermissionSheetProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Sheet visible={visible} onClose={onDismiss}>
      <View style={styles.body}>
        <Text style={styles.title}>¿Te avisamos cuando alguien te pase una tarea?</Text>
        <Button label="Activar avisos" onPress={onActivate} style={styles.primary} />
        <Button label="Ahora no" variant="link" onPress={onDismiss} />
      </View>
    </Sheet>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    body: {
      gap: spacing.md,
      paddingBottom: spacing.lg,
      alignItems: "center",
    },
    title: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 20,
      color: c.ink,
      textAlign: "center",
    },
    primary: {
      width: "100%",
      marginTop: spacing.sm,
    },
  });
}
