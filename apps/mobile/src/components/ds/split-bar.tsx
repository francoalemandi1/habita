import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";
import { computeSplitSegments } from "./split-bar-logic";

export interface SplitBarProps {
  /** Member shares in household-seniority order. */
  values: number[];
  total: number;
  accessibilityLabel: string;
}

/** §6.19 SplitBar — reparto. 8px bar, 3px gaps, ink > ink2 > #B9B3A6 by seniority. */
export function SplitBar({ values, total, accessibilityLabel }: SplitBarProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { segments, remainingFraction } = useMemo(() => computeSplitSegments(values, total), [values, total]);
  const seniorityColors = [colors.ink, colors.ink2, "#B9B3A6"];

  return (
    <View accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel} style={styles.track}>
      {segments.map((segment, index) =>
        segment.fraction > 0 ? (
          <View
            key={index}
            style={[
              styles.segment,
              { flexGrow: segment.fraction, backgroundColor: seniorityColors[segment.colorIndex % 3] },
            ]}
          />
        ) : null,
      )}
      {remainingFraction > 0 ? <View style={[styles.segment, { flexGrow: remainingFraction, backgroundColor: colors.sand }]} /> : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    track: {
      flexDirection: "row",
      height: 8,
      borderRadius: radius.rowIcon / 2 + 2,
      gap: 3,
      overflow: "hidden",
      backgroundColor: c.sand,
    },
    segment: {
      height: "100%",
      borderRadius: 4,
    },
  });
}
