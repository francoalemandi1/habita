import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Mic, Send } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

export interface ComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onMicPress?: () => void;
  placeholder?: string;
  /** Chips below the input showing what was parsed from free text (§6.22). */
  chips?: ReactNode;
}

/** §6.22 Composer — Anotar's free-text input. Trailing mic or send (monte) when there's text. */
export function Composer({ value, onChangeText, onSubmit, onMicPress, placeholder = "Anotá un gasto, tarea o ítem…", chips }: ComposerProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);
  const hasText = value.trim().length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, focused && styles.containerFocused]}>
        <TextInput
          accessibilityLabel={placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.ink3}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline
          style={styles.input}
        />
        {hasText ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Enviar" hitSlop={8} onPress={onSubmit} style={[styles.trailingButton, { backgroundColor: colors.monte }]}>
            <Send size={18} strokeWidth={1.75} color={colors.paper} />
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Dictar por voz" hitSlop={8} onPress={onMicPress} style={styles.trailingButton}>
            <Mic size={18} strokeWidth={1.75} color={colors.ink2} />
          </Pressable>
        )}
      </View>
      {chips ? <View style={styles.chipsRow}>{chips}</View> : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      gap: spacing.sm,
    },
    container: {
      flexDirection: "row",
      alignItems: "flex-end",
      backgroundColor: c.paper,
      borderRadius: radius.tile,
      borderWidth: 1.5,
      borderColor: "transparent",
      paddingLeft: 16,
      paddingRight: 6,
      paddingVertical: 6,
      gap: spacing.sm,
    },
    containerFocused: {
      backgroundColor: c.surface,
      borderColor: c.monte,
    },
    input: {
      flex: 1,
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink,
      maxHeight: 96,
      paddingVertical: 8,
    },
    trailingButton: {
      width: 40,
      height: 40,
      borderRadius: radius.control,
      alignItems: "center",
      justifyContent: "center",
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
  });
}
