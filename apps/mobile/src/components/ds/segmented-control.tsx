import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: Array<SegmentedOption<T>>;
  value: T;
  onValueChange: (value: T) => void;
  accessibilityLabel: string;
}

/** §6.7 SegmentedControl — max 3 options, active segment on surface with a soft shadow. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  accessibilityLabel,
}: SegmentedControlProps<T>): React.JSX.Element {
  if (options.length > 3) {
    throw new Error("SegmentedControl supports a maximum of 3 options (§6.7)");
  }
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={styles.container}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => onValueChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      backgroundColor: c.sand,
      borderRadius: radius.control,
      padding: 3,
    },
    segment: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.sm,
    },
    segmentActive: {
      backgroundColor: c.surface,
      borderRadius: radius.control - 3,
      shadowColor: "rgba(29,38,32,.08)",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 2,
      elevation: 1,
    },
    label: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 14,
      color: c.ink2,
    },
    labelActive: {
      color: c.ink,
      fontFamily: fontFamilyForWeight(600),
    },
  });
}
