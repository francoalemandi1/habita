import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { TransferItem } from "@habita/contracts";

export interface ParaResolverSectionProps {
  transfers: TransferItem[];
  onAccept: (transferId: string) => void;
  onReject: (transferId: string) => void;
  isResponding: boolean;
}

/** §5.3 Avisos — "Para resolver" with a Ladrillo dot and inline Aceptar / No puedo. */
export function ParaResolverSection({ transfers, onAccept, onReject, isResponding }: ParaResolverSectionProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (transfers.length === 0) return <></>;

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Para resolver</Text>
      {transfers.map((transfer) => (
        <View key={transfer.id} style={styles.card}>
          <Text style={styles.title}>{transfer.assignment.task.name}</Text>
          <Text style={styles.message}>{transfer.fromMember.name} te pide que la hagas vos.</Text>
          <View style={styles.actions}>
            <Button
              label="No puedo"
              variant="secondary"
              size="sm"
              disabled={isResponding}
              onPress={() => onReject(transfer.id)}
            />
            <Button label="Aceptar" size="sm" disabled={isResponding} onPress={() => onAccept(transfer.id)} />
          </View>
        </View>
      ))}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    label: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 12,
      letterSpacing: 0.6,
      color: c.ladrilloText,
      textTransform: "uppercase",
    },
    card: {
      borderLeftWidth: 3,
      borderLeftColor: c.ladrillo,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: spacing.md,
      gap: spacing.xs,
    },
    title: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 14,
      color: c.ink,
    },
    message: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "flex-end",
      marginTop: spacing.xs,
    },
  });
}
