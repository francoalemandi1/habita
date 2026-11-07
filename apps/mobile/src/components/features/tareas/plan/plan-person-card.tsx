import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Avatar, Chip } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { formatPlanMinutes, sumPlanMinutes } from "@/lib/tareas-plan";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { PlanAssignment } from "@habita/contracts";

interface PlanPersonCardProps {
  assignments: readonly PlanAssignment[];
  minutesByTaskName: ReadonlyMap<string, number>;
}

/** One person's card within the Plan semanal screen (handoff §5.3): avatar, tasks, total time, chips. */
export function PlanPersonCard({ assignments, minutesByTaskName }: PlanPersonCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const memberName = assignments[0]?.memberName ?? "?";
  const totalMinutesLabel = formatPlanMinutes(sumPlanMinutes(assignments, minutesByTaskName));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar name={memberName} size={40} />
        <Text style={styles.name}>{memberName}</Text>
        <Text style={styles.meta}>
          {assignments.length} tareas{totalMinutesLabel ? ` · ${totalMinutesLabel}` : ""}
        </Text>
      </View>
      <View style={styles.chipRow}>
        {assignments.map((assignment) => (
          <Chip key={assignment.taskName} label={assignment.taskName} tone="filterOff" />
        ))}
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    name: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 16,
      color: c.ink,
      flex: 1,
    },
    meta: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
  });
}
