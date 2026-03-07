import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { QuickStatItem } from "./types";

interface QuickStatsRowProps {
  stats: QuickStatItem[];
}

function getChipColors(variant: QuickStatItem["variant"], c: ThemeColors) {
  switch (variant) {
    case "success":
      return { bg: c.successBg, text: c.successText };
    case "error":
      return { bg: c.errorBg, text: c.errorText };
    default:
      return { bg: c.muted, text: c.text };
  }
}

export function QuickStatsRow({ stats }: QuickStatsRowProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (stats.length === 0) return null;

  return (
    <View style={styles.row}>
      {stats.map((stat) => {
        const chipColors = getChipColors(stat.variant, colors);
        return (
          <Pressable
            key={stat.id}
            onPress={() => router.push(stat.route as never)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: chipColors.bg },
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={[styles.chipText, { color: chipColors.text }]}>
              {stat.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
    },
    chipPressed: {
      opacity: 0.7,
    },
    chipText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "600",
    },
  });
}
