import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing, typography } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

import type { ThemeColors } from "@/theme";

interface GoogleSignInButtonProps {
  label: string;
  loading?: boolean;
  onPress: () => void;
}

/** "Continuar con Google" — Button §6.1 shape, bg Papel over the Monte screen. */
export function GoogleSignInButton({ label, loading = false, onPress }: GoogleSignInButtonProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      style={[styles.button, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      {loading ? <ActivityIndicator size={14} color={colors.ink} /> : null}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      height: 48,
      borderRadius: radius.control,
      backgroundColor: c.paper,
    },
    label: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: typography.t2.fontSize,
      color: c.ink,
    },
  });
}
