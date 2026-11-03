import { useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import type { ViewStyle } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

export type ChipTone = "filterOn" | "filterOff" | "onDay" | "dueToday" | "discount" | "waiting";

export interface ChipProps {
  label: string;
  tone?: ChipTone;
  onPress?: () => void;
  style?: ViewStyle;
}

function getToneColors(c: ThemeColors): Record<ChipTone, { bg: string; text: string; border?: string }> {
  return {
    filterOn: { bg: c.ink, text: c.paper },
    filterOff: { bg: c.surface, text: c.ink, border: c.line },
    onDay: { bg: c.monteSoft, text: c.monte },
    dueToday: { bg: c.ladrilloSoft, text: c.ladrilloText },
    discount: { bg: c.mantecaSoft, text: c.mantecaText },
    waiting: { bg: c.sand, text: c.ink2 },
  };
}

/** §6.8 Chip — filter and status tones. */
export function Chip({ label, tone = "filterOff", onPress, style }: ChipProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(), []);
  const toneColors = getToneColors(colors)[tone];

  const content = (
    <Text style={[styles.label, { color: toneColors.text }]} numberOfLines={1}>
      {label}
    </Text>
  );

  if (!onPress) {
    return (
      <Pressable
        accessibilityRole="text"
        style={[styles.base, { backgroundColor: toneColors.bg, borderColor: toneColors.border }, style]}
        disabled
      >
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={[styles.base, { backgroundColor: toneColors.bg, borderColor: toneColors.border }, style]}
    >
      {content}
    </Pressable>
  );
}

function createStyles() {
  return StyleSheet.create({
    base: {
      alignSelf: "flex-start",
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: "transparent",
      paddingHorizontal: 12,
      paddingVertical: spacing.sm,
    },
    label: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 13,
      fontWeight: "500",
    },
  });
}
