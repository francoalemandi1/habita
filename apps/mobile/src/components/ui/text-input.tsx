import type { ReactNode } from "react";
import { forwardRef, useState } from "react";
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { colors, fontFamily, radius, spacing } from "@/theme";

interface StyledTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: import("react-native").StyleProp<import("react-native").ViewStyle>;
}

export const StyledTextInput = forwardRef<TextInput, StyledTextInputProps>(
  function StyledTextInput(
    { label, error, leftIcon, rightIcon, onRightIconPress, style, containerStyle, ...props },
    ref
  ) {
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

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 44,
  },
  containerFocused: {
    borderColor: colors.primary,
  },
  containerError: {
    borderColor: colors.destructive,
  },
  input: {
    fontFamily: fontFamily.sans,
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
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
    color: colors.destructive,
  },
});
