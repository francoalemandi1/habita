import type { ReactNode } from "react";
import { forwardRef, useMemo, useState } from "react";
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

interface StyledTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: import("react-native").StyleProp<import("react-native").ViewStyle>;
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      gap: spacing.xs,
    },
    label: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "600",
      color: c.text,
    },
    container: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      minHeight: 44,
    },
    containerFocused: {
      borderColor: c.primary,
    },
    containerError: {
      borderColor: c.destructive,
    },
    input: {
      fontFamily: fontFamily.sans,
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      fontSize: 14,
      color: c.text,
    },
    inputWithLeft: {
      paddingLeft: spacing.xs,
    },
    inputWithRight: {
      paddingRight: spacing.xs,
    },
    leftIcon: {
      paddingLeft: spacing.md,
    },
    rightIcon: {
      paddingRight: spacing.md,
    },
    error: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.destructive,
    },
  });
}

export const StyledTextInput = forwardRef<TextInput, StyledTextInputProps>(
  function StyledTextInput(
    { label, error, leftIcon, rightIcon, onRightIconPress, style, containerStyle, ...props },
    ref
  ) {
    const colors = useThemeColors();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View
          style={[
            styles.container,
            isFocused && styles.containerFocused,
            error ? styles.containerError : null,
          ]}
        >
          {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
          <TextInput
            ref={ref}
            style={[styles.input, leftIcon ? styles.inputWithLeft : null, rightIcon ? styles.inputWithRight : null, style]}
            placeholderTextColor={colors.mutedForeground}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          {rightIcon ? (
            onRightIconPress ? (
              <Pressable onPress={onRightIconPress} style={styles.rightIcon}>
                {rightIcon}
              </Pressable>
            ) : (
              <View style={styles.rightIcon}>{rightIcon}</View>
            )
          ) : null}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }
);
