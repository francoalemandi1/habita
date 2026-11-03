import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

export interface CoachmarkProps {
  text: string;
  onDismiss: () => void;
}

/** §6.23 Coachmark — ink bg, 12px arrow, shown once per tip by the caller. */
export function Coachmark({ text, onDismiss }: CoachmarkProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${text}. Tocar para cerrar.`}
      onPress={onDismiss}
      style={styles.wrapper}
    >
      <View style={styles.bubble}>
        <Text style={styles.text}>{text}</Text>
      </View>
      <View style={styles.arrow} />
    </Pressable>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      alignItems: "flex-start",
    },
    bubble: {
      backgroundColor: c.ink,
      borderRadius: radius.tile,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      maxWidth: 260,
    },
    text: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 14,
      color: c.paper,
    },
    arrow: {
      width: 12,
      height: 12,
      marginLeft: 20,
      marginTop: -6,
      backgroundColor: c.ink,
      transform: [{ rotate: "45deg" }],
    },
  });
}
