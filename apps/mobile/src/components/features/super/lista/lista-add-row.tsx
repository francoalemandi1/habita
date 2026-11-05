import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { ListPlus } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";

import type { ThemeColors } from "@/theme";

interface ListaAddRowProps {
  onAdd: (name: string) => void;
  onOpenCatalog: () => void;
  disabled?: boolean;
}

/** "Agregar producto…" — submits on Enter; the catalog icon opens the full picker. */
export function ListaAddRow({ onAdd, onOpenCatalog, disabled }: ListaAddRowProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [value, setValue] = useState("");

  function submit(): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  }

  return (
    <View style={styles.row}>
      <TextInput
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        placeholder="Agregar producto…"
        placeholderTextColor={colors.ink3}
        maxLength={100}
        editable={!disabled}
        returnKeyType="done"
        accessibilityLabel="Agregar producto"
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir catálogo de productos"
        disabled={disabled}
        onPress={onOpenCatalog}
        style={[styles.catalogBtn, disabled && styles.disabled]}
      >
        <ListPlus size={18} strokeWidth={1.75} color={colors.ink2} />
      </Pressable>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.sm },
    input: {
      flex: 1,
      height: 44,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.paper,
      paddingHorizontal: spacing.md,
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink,
    },
    catalogBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.paper,
      alignItems: "center",
      justifyContent: "center",
    },
    disabled: { opacity: 0.5 },
  });
}
