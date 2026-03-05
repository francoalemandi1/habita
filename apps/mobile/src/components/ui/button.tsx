import type { ReactNode } from "react";
import { Children, isValidElement, useMemo } from "react";
import { Animated, Pressable, Text, View, ActivityIndicator, StyleSheet } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { PressableProps, ViewStyle } from "react-native";

type ButtonVariant = "default" | "outline" | "ghost" | "destructive" | "success";
type ButtonSize = "default" | "sm" | "lg" | "icon";

interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
  style?: ViewStyle;
}

function getVariantStyles(c: ThemeColors): Record<ButtonVariant, { bg: string; text: string; border?: string }> {
  return {
    default: { bg: c.primary, text: "#ffffff" },
    outline: { bg: "transparent", text: c.text, border: c.border },
    ghost: { bg: "transparent", text: c.text },
    destructive: { bg: c.destructive, text: "#ffffff" },
    success: { bg: c.success, text: "#ffffff" },
  };
}

const sizeStyles: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number }> = {
  default: { height: 44, paddingHorizontal: spacing.lg, fontSize: 14 },
  sm: { height: 36, paddingHorizontal: spacing.md, fontSize: 13 },
  lg: { height: 52, paddingHorizontal: spacing.xl, fontSize: 16 },
  icon: { height: 44, paddingHorizontal: spacing.sm, fontSize: 14 },
};

/** Renders children handling both text strings and React elements (icons). */
function renderChildren(children: ReactNode, textColor: string, fontSize: number) {
  const childArray = Children.toArray(children);
  const hasElement = childArray.some((child) => isValidElement(child));

  if (!hasElement) {
    return (
      <Text style={[styles.text, { color: textColor, fontSize }]}>
        {children}
      </Text>
    );
  }

  return (
    <>
      {childArray.map((child, i) => {
        if (isValidElement(child)) return <View key={i}>{child}</View>;
        if (typeof child === "string" || typeof child === "number") {
          return (
            <Text key={i} style={[styles.text, { color: textColor, fontSize }]}>
              {child}
            </Text>
          );
        }
        return null;
      })}
    </>
  );
}

export function Button({
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  onPress,
  children,
  style,
  ...props
}: ButtonProps) {
  const colors = useThemeColors();
  const scale = useMemo(() => new Animated.Value(1), []);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  const variantMap = useMemo(() => getVariantStyles(colors), [colors]);
  const v = variantMap[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled ?? loading;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[
          styles.base,
          {
            height: s.height,
            paddingHorizontal: s.paddingHorizontal,
            backgroundColor: v.bg,
            borderRadius: radius.full,
            borderWidth: v.border ? 1.5 : 0,
            borderColor: v.border,
            opacity: isDisabled ? 0.5 : 1,
          },
        ]}
        {...props}
      >
        {loading ? (
          <ActivityIndicator size="small" color={v.text} />
        ) : (
          renderChildren(children, v.text, s.fontSize)
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  text: {
    fontFamily: fontFamily.sans,
    fontWeight: "600",
    textAlign: "center",
  },
});
