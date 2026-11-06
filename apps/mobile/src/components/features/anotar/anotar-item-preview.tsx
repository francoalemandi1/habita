import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Button, Chip, Stepper } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import type { ThemeColors } from "@/theme";
import type { AnotarSaveInput } from "@/hooks/use-anotar-save";
import type { ItemDraftEntry } from "@/lib/anotar-draft-logic";

interface AnotarItemPreviewProps {
  items: ItemDraftEntry[];
  onChangeItems: (items: ItemDraftEntry[]) => void;
  isSaving: boolean;
  onSave: (input: AnotarSaveInput) => Promise<boolean>;
  onSaved: (wasQueued: boolean) => void;
}

/** §6.22 Composer preview — one or more shopping-list items with editable quantity. Controlled by the parent. */
export function AnotarItemPreview({ items, onChangeItems, isSaving, onSave, onSaved }: AnotarItemPreviewProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [error, setError] = useState<string | null>(null);

  const setQuantity = (index: number, quantity: number) => {
    onChangeItems(items.map((item, i) => (i === index ? { ...item, quantity } : item)));
  };

  const handleSave = async () => {
    setError(null);
    try {
      const wasQueued = await onSave({ kind: "item", items: items.map(({ name, quantity }) => ({ name, quantity })) });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved(wasQueued);
    } catch (saveError) {
      setError(getMobileErrorMessage(saveError));
    }
  };

  return (
    <View style={styles.container}>
      <Chip label="Compra" tone="onDay" />

      {items.map((item, index) => (
        <View key={`${item.name}-${index}`} style={styles.itemRow}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          <Stepper
            value={item.quantity}
            onValueChange={(quantity) => setQuantity(index, quantity)}
            min={1}
            max={99}
            accessibilityLabel={item.name}
          />
        </View>
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="Sumar a la lista" loadingLabel="Guardando" loading={isSaving} onPress={() => void handleSave()} />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    itemName: {
      flex: 1,
      fontFamily: fontFamilyForWeight(600),
      fontSize: 15,
      color: c.ink,
    },
    error: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ladrilloText,
    },
  });
}
