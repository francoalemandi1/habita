import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight } from "@/theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

export interface StepperProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  accessibilityLabel: string;
}

/** §6.5 Stepper — 40x40 buttons, tabular value. */
export function Stepper({
  value,
  onValueChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  accessibilityLabel,
}: StepperProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const canDecrement = value - step >= min;
  const canIncrement = value + step <= max;

  return (
    <View style={styles.container} accessibilityLabel={accessibilityLabel}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Restar de ${accessibilityLabel}`}
        accessibilityState={{ disabled: !canDecrement }}
        disabled={!canDecrement}
        hitSlop={4}
        onPress={() => onValueChange(Math.max(min, value - step))}
        style={[styles.button, !canDecrement && styles.buttonDisabled]}
      >
        <Minus size={18} strokeWidth={1.75} color={canDecrement ? colors.ink : colors.ink3} />
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sumar a ${accessibilityLabel}`}
        accessibilityState={{ disabled: !canIncrement }}
        disabled={!canIncrement}
        hitSlop={4}
        onPress={() => onValueChange(Math.min(max, value + step))}
        style={[styles.button, !canIncrement && styles.buttonDisabled]}
      >
        <Plus size={18} strokeWidth={1.75} color={canIncrement ? colors.ink : colors.ink3} />
      </Pressable>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.paper,
      borderRadius: radius.control,
      gap: 4,
    },
    button: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    value: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 16,
      fontVariant: ["tabular-nums"],
      color: c.ink,
      minWidth: 32,
      textAlign: "center",
    },
  });
}
