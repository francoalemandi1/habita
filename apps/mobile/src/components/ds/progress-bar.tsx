import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

export interface ProgressBarProps {
  /** 0-1 fraction complete. */
  progress: number;
  accessibilityLabel: string;
}

/** §6.19 ProgressBar — 8px, radius 4. Always paired with explanatory text by the caller. */
export function ProgressBar({ progress, accessibilityLabel }: ProgressBarProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    track: {
      height: 8,
      borderRadius: radius.rowIcon / 2 + 2,
      backgroundColor: c.sand,
      overflow: "hidden",
    },
    fill: {
      height: "100%",
      borderRadius: 4,
      backgroundColor: c.monte,
    },
  });
}
