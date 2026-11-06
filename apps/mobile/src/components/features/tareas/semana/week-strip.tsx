import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { buildWeekStrip } from "@/lib/tareas-week-strip";

import type { ThemeColors } from "@/theme";

interface WeekStripProps {
  now: Date;
  assignmentDueDateKeys: readonly string[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

/** 7-day strip (handoff §5.3): today in manteca, a dot for days with tasks. */
export function WeekStrip({ now, assignmentDueDateKeys, selectedKey, onSelect }: WeekStripProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const days = useMemo(() => buildWeekStrip(now, assignmentDueDateKeys), [now, assignmentDueDateKeys]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {days.map((day) => {
        const isSelected = day.key === selectedKey;
        return (
          <Pressable
            key={day.key}
            accessibilityRole="button"
            accessibilityLabel={`${day.label} ${day.dayNumber}`}
            onPress={() => onSelect(day.key)}
            style={[styles.pill, day.isToday && styles.pillToday, isSelected && styles.pillSelected]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{day.label}</Text>
            <Text style={[styles.number, isSelected && styles.labelSelected]}>{day.dayNumber}</Text>
            <View style={[styles.dot, day.hasTasks ? styles.dotVisible : null]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    pill: {
      width: 48,
      height: 64,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      backgroundColor: c.surface,
    },
    pillToday: {
      backgroundColor: c.manteca,
    },
    pillSelected: {
      backgroundColor: c.ink,
    },
    label: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 11,
      color: c.ink2,
    },
    number: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 16,
      color: c.ink,
    },
    labelSelected: {
      color: c.paper,
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: "transparent",
    },
    dotVisible: {
      backgroundColor: c.ladrillo,
    },
  });
}
