import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight } from "@/theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

export type BadgeTone = "monte" | "ladrillo" | "manteca" | "sand";

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

function getToneColors(c: ThemeColors): Record<BadgeTone, { bg: string; text: string }> {
  return {
    monte: { bg: c.monteSoft, text: c.monte },
    ladrillo: { bg: c.ladrilloSoft, text: c.ladrilloText },
    manteca: { bg: c.mantecaSoft, text: c.mantecaText },
    sand: { bg: c.sand, text: c.ink2 },
  };
}

/** Small status badge, distinct from Chip (non-interactive, no filter semantics). */
export function Badge({ label, tone = "sand" }: BadgeProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(), []);
  const toneColors = getToneColors(colors)[tone];

  return (
    <View accessibilityRole="text" style={[styles.base, { backgroundColor: toneColors.bg }]}>
      <Text style={[styles.label, { color: toneColors.text }]}>{label}</Text>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    base: {
      alignSelf: "flex-start",
      borderRadius: radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    label: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 11,
      fontWeight: "600",
    },
  });
}
