import { useMemo, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";
import { Button } from "./button";
import { TextField } from "./text-field";

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  icon?: LucideIcon;
  title: string;
  body: string;
  cancelLabel?: string;
  actionLabel: string;
  onConfirm: () => void;
  /** When set, the action stays disabled until the user types this exact name (§6.16). */
  confirmName?: string;
}

/** §6.16 Dialog — centered, destructive confirmations and type-name-to-confirm. */
export function Dialog({
  visible,
  onClose,
  icon: Icon,
  title,
  body,
  cancelLabel = "Cancelar",
  actionLabel,
  onConfirm,
  confirmName,
}: DialogProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [typedName, setTypedName] = useState("");
  const nameMatches = !confirmName || typedName === confirmName;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityRole="alert">
          {Icon ? (
            <View style={styles.iconBox}>
              <Icon size={22} strokeWidth={1.75} color={colors.ladrillo} />
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          {confirmName ? (
            <TextField
              label={`Escribí ${confirmName} para confirmar`}
              value={typedName}
              onChangeText={setTypedName}
              autoCapitalize="none"
            />
          ) : null}
          <View style={styles.actions}>
            <Button label={cancelLabel} variant="secondary" style={styles.actionButton} onPress={onClose} />
            <Button
              label={actionLabel}
              variant="destructive"
              disabled={!nameMatches}
              style={styles.actionButton}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.scrim,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    dialog: {
      width: "100%",
      backgroundColor: c.sand,
      borderRadius: radius.dialog,
      padding: 24,
      gap: spacing.md,
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.ladrilloSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 22,
      fontWeight: "700",
      color: c.ink,
    },
    body: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink2,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    actionButton: {
      flex: 1,
    },
  });
}
