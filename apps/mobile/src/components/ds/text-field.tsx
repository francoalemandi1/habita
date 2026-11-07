import { forwardRef, useMemo, useState } from "react";
import { TextInput, View, Text, StyleSheet } from "react-native";
import type { TextInputProps, ViewStyle } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing, typography } from "@/theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
}

/** §6.3 TextField — label always above, focus/error border states. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, style, containerStyle, editable = true, ...props },
  ref,
) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        editable={editable}
        style={[
          styles.input,
          focused && !error && styles.inputFocused,
          error ? styles.inputError : null,
          !editable && styles.inputDisabled,
          style,
        ]}
        placeholderTextColor={colors.ink3}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      gap: spacing.xs,
    },
    label: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 13,
      fontWeight: "600",
      color: c.ink,
    },
    input: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: typography.b1.fontSize,
      minHeight: 44,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: c.paper,
      backgroundColor: c.paper,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: c.ink,
    },
    inputFocused: {
      borderWidth: 1.5,
      borderColor: c.monte,
      backgroundColor: c.surface,
    },
    inputError: {
      borderColor: c.ladrillo,
    },
    inputDisabled: {
      color: c.ink3,
    },
    error: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ladrilloText,
    },
  });
}
