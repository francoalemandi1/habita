import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stepper, Toggle, useSnackbar } from "@/components/ds";
import { useUpdateMemberSettings } from "@/hooks/use-member-settings";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

const DEFAULT_QUIET_START = 23;
const DEFAULT_QUIET_END = 8;

export interface QuietHoursSectionProps {
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
}

/** §5.3 Configuración de avisos — "No molestar de 23 a 8 h", pattern A. */
export function QuietHoursSection({ quietHoursStart, quietHoursEnd }: QuietHoursSectionProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const updateSettings = useUpdateMemberSettings();
  const snackbar = useSnackbar();

  const isEnabled = quietHoursStart !== null && quietHoursEnd !== null;

  const save = (start: number | null, end: number | null) => {
    updateSettings.mutate(
      { quietHoursStart: start, quietHoursEnd: end },
      {
        onError: () => {
          snackbar.show({
            text: "No se pudo guardar",
            tone: "error",
            actionLabel: "Reintentar",
            onAction: () => save(start, end),
          });
        },
      },
    );
  };

  const handleToggle = (next: boolean) => {
    save(next ? DEFAULT_QUIET_START : null, next ? DEFAULT_QUIET_END : null);
  };

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Text style={styles.label}>No molestar</Text>
        <Toggle value={isEnabled} onValueChange={handleToggle} accessibilityLabel="No molestar" />
      </View>
      {isEnabled ? (
        <View style={styles.hoursRow}>
          <View style={styles.hourBlock}>
            <Text style={styles.hourLabel}>Desde</Text>
            <Stepper
              value={quietHoursStart ?? DEFAULT_QUIET_START}
              onValueChange={(value) => save(value, quietHoursEnd)}
              min={0}
              max={23}
              accessibilityLabel="Hora de inicio de no molestar"
            />
          </View>
          <View style={styles.hourBlock}>
            <Text style={styles.hourLabel}>Hasta</Text>
            <Stepper
              value={quietHoursEnd ?? DEFAULT_QUIET_END}
              onValueChange={(value) => save(quietHoursStart, value)}
              min={0}
              max={23}
              accessibilityLabel="Hora de fin de no molestar"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      marginTop: spacing.lg,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    label: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      color: c.ink,
    },
    hoursRow: {
      flexDirection: "row",
      gap: spacing.lg,
      marginTop: spacing.md,
    },
    hourBlock: {
      gap: spacing.xs,
    },
    hourLabel: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 12,
      color: c.ink2,
    },
  });
}
