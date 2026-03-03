import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontFamily, radius } from "@/theme";

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

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
  default: { bg: colors.primary, text: "#ffffff" },
  secondary: { bg: colors.muted, text: colors.mutedForeground },
  destructive: { bg: colors.destructive, text: "#ffffff" },
  outline: { bg: "transparent", text: colors.text, border: colors.border },
  success: { bg: colors.success, text: "#ffffff" },
  warning: { bg: colors.warning, text: "#ffffff" },
};

export function Badge({
  children,
  variant = "default",
  bgColor,
  textColor,
  size = "default",
  style: styleProp,
}: BadgeProps) {
  const v = variantStyles[variant];
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
