import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import type { PressableProps, ViewStyle } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing, typography } from "@/theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

export type ButtonVariant = "primary" | "ink" | "secondary" | "link" | "destructive";
export type ButtonSize = "sm" | "default";

export interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  label: string;
  /** Shown instead of `label` while loading, e.g. "Liquidando". */
  loadingLabel?: string;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  style?: ViewStyle;
}

function getVariantColors(c: ThemeColors, variant: ButtonVariant) {
  switch (variant) {
    case "primary":
      return { bg: c.monte, pressedBg: c.montePressed, text: c.paper };
    case "ink":
      return { bg: c.ink, pressedBg: c.ink, text: c.paper };
    case "secondary":
      return { bg: c.sand, pressedBg: c.sand, text: c.ink };
    case "destructive":
      return { bg: c.ladrillo, pressedBg: c.ladrillo, text: c.paper };
    case "link":
      return { bg: "transparent", pressedBg: "transparent", text: c.monte };
  }
}

/** §6.1 Button — primary is the single accent action per screen. */
export function Button({
  label,
  loadingLabel,
  loading = false,
  variant = "primary",
  size = "default",
  disabled = false,
  style,
  onPress,
  ...props
}: ButtonProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(), []);
  const [pressed, setPressed] = useState(false);
  const isDisabled = disabled || loading;
  const variantColors = getVariantColors(colors, variant);
  const bg = isDisabled ? colors.sand : pressed ? variantColors.pressedBg : variantColors.bg;
  const textColor = isDisabled ? colors.ink3 : variantColors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      hitSlop={8}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      style={[
        styles.base,
        size === "sm" && styles.sm,
        variant === "link" && styles.linkBase,
        { backgroundColor: bg, transform: [{ scale: pressed && !isDisabled ? 0.97 : 1 }] },
        style,
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator size={14} color={textColor} /> : null}
      <Text
        style={[
          styles.label,
          variant === "link" && styles.linkLabel,
          { color: textColor },
        ]}
        numberOfLines={1}
      >
        {loading && loadingLabel ? loadingLabel : label}
      </Text>
    </Pressable>
  );
}

function createStyles() {
  return StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      height: 48,
      minWidth: 44,
      borderRadius: radius.control,
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    sm: {
      height: 36,
    },
    linkBase: {
      height: "auto",
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    label: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: typography.t2.fontSize,
      fontWeight: "600",
    },
    linkLabel: {
      textDecorationLine: "underline",
    },
  });
}
