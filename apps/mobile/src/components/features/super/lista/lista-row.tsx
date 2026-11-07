import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { Checkbox, PendingDot, Stepper } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { ShoppingListItem } from "@habita/contracts";

interface ListaRowProps {
  item: ShoppingListItem;
  currentMemberId: string;
  isOffer: boolean;
  isPendingSync: boolean;
  onToggle: () => void;
  onQuantityChange: (quantity: number) => void;
  onDelete: () => void;
}

/** One row of the shared shopping list — pattern A: strike through, stay put until the row moves to the end on the next sort, haptic only. */
export function ListaRow({
  item,
  currentMemberId,
  isOffer,
  isPendingSync,
  onToggle,
  onQuantityChange,
  onDelete,
}: ListaRowProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isChecked = item.checkedAt !== null;

  return (
    <View style={styles.row}>
      <Checkbox
        state={isChecked ? "done" : "pending"}
        onToggle={onToggle}
        accessibilityLabel={isChecked ? `Desmarcar ${item.name}` : `Marcar ${item.name}`}
      />
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, isChecked && styles.nameChecked]} numberOfLines={1}>
            {item.name}
          </Text>
          {isOffer && !isChecked ? (
            <View style={styles.offerTag}>
              <Text style={styles.offerTagText}>oferta</Text>
            </View>
          ) : null}
          {isPendingSync ? <PendingDot /> : null}
        </View>
        {item.addedBy.id !== currentMemberId ? (
          <Text style={styles.addedBy} numberOfLines={1}>
            lo agregó {item.addedBy.name}
          </Text>
        ) : null}
      </View>
      <Stepper
        value={item.quantity}
        onValueChange={onQuantityChange}
        min={1}
        max={99}
        accessibilityLabel={`cantidad de ${item.name}`}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Eliminar ${item.name}`}
        hitSlop={8}
        onPress={onDelete}
        style={styles.deleteBtn}
      >
        <Trash2 size={16} strokeWidth={1.75} color={colors.ink3} />
      </Pressable>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: 60,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.lineSoft,
    },
    body: { flex: 1, minWidth: 0, gap: 2 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    name: { fontFamily: fontFamilyForWeight(500), fontSize: 15, color: c.ink, flexShrink: 1 },
    nameChecked: { color: c.ink3, textDecorationLine: "line-through" },
    offerTag: { backgroundColor: c.mantecaSoft, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
    offerTagText: { fontFamily: fontFamilyForWeight(600), fontSize: 11, color: c.mantecaText },
    addedBy: { fontFamily: fontFamilyForWeight(400), fontSize: 13, color: c.ink2 },
    deleteBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  });
}
