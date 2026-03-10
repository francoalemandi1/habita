import type { ReactNode } from "react";
import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { ViewStyle } from "react-native";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  bgColor?: string;
  textColor?: string;
  size?: "sm" | "default";
  style?: ViewStyle;
}

function getVariantStyles(c: ThemeColors): Record<BadgeVariant, { bg: string; text: string; border?: string }> {
  return {
    default: { bg: c.primary, text: c.white },
    secondary: { bg: c.muted, text: c.mutedForeground },
    destructive: { bg: c.destructive, text: c.white },
    outline: { bg: "transparent", text: c.text, border: c.border },
    success: { bg: c.success, text: c.white },
    warning: { bg: c.warning, text: c.white },
  };
}

export function Badge({
  children,
  variant = "default",
  bgColor,
  textColor,
  size = "default",
  style: styleProp,
}: BadgeProps) {
  const colors = useThemeColors();
  const variantMap = useMemo(() => getVariantStyles(colors), [colors]);
  const v = variantMap[variant];
  const bg = bgColor ?? v.bg;
  const text = textColor ?? v.text;

  return (
    <View
      style={[
        styles.base,
        size === "sm" && styles.sm,
        {
          backgroundColor: bg,
          borderRadius: radius.full,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
        },
        styleProp,
      ]}
    >
      <Text style={[styles.text, size === "sm" && styles.textSm, { color: text }]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  textSm: {
    fontSize: 11,
  },
});
