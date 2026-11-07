import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing, typography } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

import type { ThemeColors } from "@/theme";
import type { HouseholdComposition } from "@/lib/onboarding-starter-tasks";

interface CompositionOption {
  value: HouseholdComposition;
  label: string;
}

const OPTIONS: CompositionOption[] = [
  { value: "solo", label: "Solo/a" },
  { value: "pareja", label: "En pareja" },
  { value: "compartida", label: "Compartida" },
  { value: "familia", label: "Familia" },
];

interface CompositionGridProps {
  value: HouseholdComposition | null;
  onChange: (value: HouseholdComposition) => void;
}

/** "¿Con quién vivís?" — 2x2 grid, selected = Salvia (monteSoft) with Monte border. Handoff §5.3. */
export function CompositionGrid({ value, onChange }: CompositionGridProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option.value)}
            style={[styles.tile, selected && styles.tileSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    tile: {
      width: "48%",
      height: 64,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    tileSelected: {
      borderColor: c.monte,
      backgroundColor: c.monteSoft,
    },
    label: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: typography.t2.fontSize,
      color: c.ink,
    },
    labelSelected: {
      color: c.monte,
    },
  });
}
