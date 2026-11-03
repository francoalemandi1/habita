import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing, typography } from "@/theme";

import type { ThemeColors } from "@/theme";

export interface RadioOption<T extends string> {
  value: T;
  label: string;
}

export interface RadioGroupProps<T extends string> {
  options: Array<RadioOption<T>>;
  value: T | null;
  onValueChange: (value: T) => void;
  accessibilityLabel: string;
}

/** §6.6 Radio — 22px circle, on = 6px border. For 2-5 options. */
export function RadioGroup<T extends string>({
  options,
  value,
  onValueChange,
  accessibilityLabel,
}: RadioGroupProps<T>): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.group}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.label}
            hitSlop={8}
            onPress={() => onValueChange(option.value)}
            style={styles.row}
          >
            <View style={[styles.circle, selected && styles.circleSelected]} />
            <Text style={styles.label}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    group: {
      gap: spacing.md,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 44,
    },
    circle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: c.line,
    },
    circleSelected: {
      borderWidth: 6,
      borderColor: c.monte,
    },
    label: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: typography.b1.fontSize,
      color: c.ink,
    },
  });
}
