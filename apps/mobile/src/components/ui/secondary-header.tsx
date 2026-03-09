import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { spacing, typography } from "@/theme";

import type { ThemeColors } from "@/theme";

interface SecondaryHeaderProps {
  title: string;
  rightAction?: React.ReactNode;
}

export function SecondaryHeader({ title, rightAction }: SecondaryHeaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
        <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
      </Pressable>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {rightAction ?? <View style={styles.backBtn} />}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      ...typography.cardTitle,
    },
  });
}
