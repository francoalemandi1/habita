import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing } from "@/theme";

import type { LucideIcon } from "lucide-react-native";
import type { ThemeColors } from "@/theme";

interface ActionAlertProps {
  icon: LucideIcon;
  text: string;
  iconColor: string;
  bgColor: string;
  route: string;
}

export function ActionAlert({ icon: Icon, text, iconColor, bgColor, route }: ActionAlertProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={() => router.push(route as never)}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: bgColor },
        pressed && styles.pressed,
      ]}
    >
      <Icon size={16} color={iconColor} />
      <Text style={[styles.text, { color: iconColor }]} numberOfLines={1}>
        {text}
      </Text>
      <ChevronRight size={14} color={iconColor} />
    </Pressable>
  );
}

function createStyles(_c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
    },
    pressed: {
      opacity: 0.7,
    },
    text: {
      flex: 1,
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "500",
    },
  });
}
