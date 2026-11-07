import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  AVAILABILITY_SLOTS,
  AVAILABILITY_SLOT_LABELS,
  AVAILABILITY_WEEKDAYS,
  isSlotAvailable,
  normalizeAvailabilityGrid,
  toggleAvailabilitySlot,
} from "@habita/domain";
import { useSnackbar } from "@/components/ds";
import { useUpdateMemberSettings } from "@/hooks/use-member-settings";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { AvailabilityGrid, AvailabilityGridSlot } from "@habita/domain";

export interface DisponibilidadGridProps {
  grid: AvailabilityGrid | null;
}

/** §5.3 Disponibilidad — 7 days × Mañana/Tarde/Noche, Monte = available. Pattern A. */
export function DisponibilidadGrid({ grid }: DisponibilidadGridProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const updateSettings = useUpdateMemberSettings();
  const snackbar = useSnackbar();

  const handleToggle = (weekday: number, slot: AvailabilityGridSlot) => {
    const next = normalizeAvailabilityGrid(toggleAvailabilitySlot(grid, weekday, slot));
    updateSettings.mutate(
      { availability: next },
      {
        onError: () => {
          snackbar.show({
            text: "No se pudo guardar",
            tone: "error",
            actionLabel: "Reintentar",
            onAction: () => handleToggle(weekday, slot),
          });
        },
      },
    );
  };

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.slotLabelCell} />
        {AVAILABILITY_WEEKDAYS.map((day) => (
          <Text key={day.weekday} style={styles.dayLabel}>
            {day.label}
          </Text>
        ))}
      </View>
      {AVAILABILITY_SLOTS.map((slot) => (
        <View key={slot} style={styles.gridRow}>
          <Text style={styles.slotLabel}>{AVAILABILITY_SLOT_LABELS[slot]}</Text>
          {AVAILABILITY_WEEKDAYS.map((day) => {
            const available = isSlotAvailable(grid, day.weekday, slot);
            return (
              <Pressable
                key={day.weekday}
                accessibilityRole="switch"
                accessibilityState={{ checked: available }}
                accessibilityLabel={`${AVAILABILITY_SLOT_LABELS[slot]} ${day.label}`}
                onPress={() => handleToggle(day.weekday, slot)}
                style={[styles.cell, available ? styles.cellAvailable : styles.cellUnavailable]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: "row",
      marginBottom: spacing.xs,
    },
    slotLabelCell: {
      width: 56,
    },
    dayLabel: {
      flex: 1,
      textAlign: "center",
      fontFamily: fontFamilyForWeight(600),
      fontSize: 12,
      color: c.ink2,
    },
    gridRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.xs,
    },
    slotLabel: {
      width: 56,
      fontFamily: fontFamilyForWeight(500),
      fontSize: 12,
      color: c.ink2,
    },
    cell: {
      flex: 1,
      height: 40,
      borderRadius: 6,
      marginHorizontal: 2,
    },
    cellAvailable: {
      backgroundColor: c.monte,
    },
    cellUnavailable: {
      backgroundColor: c.sand,
    },
  });
}
