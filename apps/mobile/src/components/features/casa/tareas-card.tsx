import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Checkbox, PendingDot, SplitBar } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { usePendingAssignmentIds } from "@/hooks/use-toggle-assignment";
import { fontFamilyForWeight, spacing } from "@/theme";
import { toCheckboxState } from "@/lib/casa-week";
import { radii as radius } from "@habita/design-tokens";

import type { ThemeColors } from "@/theme";
import type { AssignmentSummary } from "@habita/contracts";
import type { WeekTasksSummary } from "@habita/domain";
import type { CheckboxState } from "@/components/ds";

export interface TareasCardProps {
  weekSummary: WeekTasksSummary;
  isSolo: boolean;
  todayAssignments: AssignmentSummary[];
  requiresVerification: boolean;
  onToggle: (assignment: AssignmentSummary, next: CheckboxState) => void;
}

function buildLegend(summary: WeekTasksSummary): string {
  const parts = summary.shares.map((share, index) => `${index === 0 ? "Vos" : share.name} ${share.done}`);
  const legend = parts.join(" · ");
  return summary.isEven ? `${legend} · Parejo` : legend;
}

/** Casa "Tareas" card (§5.3): week split, legend and today's open tasks. */
export function TareasCard({ weekSummary, isSolo, todayAssignments, requiresVerification, onToggle }: TareasCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pendingAssignmentIds = usePendingAssignmentIds();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{`${weekSummary.done} de ${weekSummary.total} hechas`}</Text>

      {!isSolo ? (
        <View style={styles.splitSection}>
          <SplitBar
            values={weekSummary.shares.map((share) => share.done)}
            total={weekSummary.total}
            accessibilityLabel="Reparto de tareas de la semana"
          />
          <Text style={styles.legend}>{buildLegend(weekSummary)}</Text>
        </View>
      ) : null}

      {todayAssignments.length > 0 ? (
        <View style={styles.taskList}>
          {todayAssignments.map((assignment) => (
            <View key={assignment.id} style={styles.taskRow}>
              <Checkbox
                state={toCheckboxState(assignment.status, requiresVerification)}
                onToggle={(next) => onToggle(assignment, next)}
                requiresVerification={requiresVerification}
                accessibilityLabel={assignment.task.name}
              />
              <Text style={styles.taskName} numberOfLines={1}>{assignment.task.name}</Text>
              {pendingAssignmentIds.has(assignment.id) ? <PendingDot /> : null}
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyToday}>Sin tareas para hoy</Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver la semana"
        hitSlop={8}
        onPress={() => router.push("/(app)/tareas")}
        style={styles.footerLink}
      >
        <Text style={styles.footerLinkText}>Ver la semana</Text>
        <ChevronRight size={14} strokeWidth={1.75} color={colors.monte} />
      </Pressable>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.card,
      padding: spacing.xl,
      gap: spacing.md,
    },
    title: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 22,
      color: c.ink,
    },
    splitSection: {
      gap: spacing.sm,
    },
    legend: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
    taskList: {
      gap: 2,
    },
    taskRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: 44,
    },
    taskName: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 16,
      color: c.ink,
      flex: 1,
    },
    emptyToday: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink2,
    },
    footerLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: spacing.xs,
    },
    footerLinkText: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 14,
      color: c.monte,
    },
  });
}
