import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Check, ChevronRight, Clock } from "lucide-react-native";
import { useCompleteAssignment } from "@/hooks/use-assignments";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { AssignmentSummary } from "@habita/contracts";

interface DashboardTodayTasksProps {
  assignments: AssignmentSummary[];
}

const TODAY_HEADLINES = [
  "¡A darle! 💪",
  "¡Manos a la obra! 🙌",
  "¡Vamos que se puede! 🚀",
  "Tu día te espera ☀️",
  "¡Dale que va! 💥",
  "¡Arrancamos! 🔥",
];

const ALL_CLEAR_HEADLINES = [
  "Todo al día ✨",
  "¡Impecable! ✨",
  "Nada pendiente 🎉",
];

function pickByHour(options: string[]): string {
  const hour = new Date().getHours();
  return options[hour % options.length] ?? options[0] ?? "";
}

export function DashboardTodayTasks({ assignments }: DashboardTodayTasksProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const completeAssignment = useCompleteAssignment();
  const [optimisticDone, setOptimisticDone] = useState<Set<string>>(new Set());

  const pending = assignments.filter(
    (a) => a.status !== "COMPLETED" && a.status !== "VERIFIED" && !optimisticDone.has(a.id),
  );
  const doneCount = assignments.length - pending.length;
  const allDone = pending.length === 0 && assignments.length > 0;
  const noTasks = assignments.length === 0;

  const handleComplete = (assignmentId: string) => {
    setOptimisticDone((prev) => new Set(prev).add(assignmentId));
    completeAssignment.mutate(assignmentId, {
      onError: () => {
        setOptimisticDone((prev) => {
          const next = new Set(prev);
          next.delete(assignmentId);
          return next;
        });
      },
    });
  };

  const headline = allDone || noTasks
    ? pickByHour(ALL_CLEAR_HEADLINES)
    : pickByHour(TODAY_HEADLINES);

  return (
    <View style={styles.container}>
      <Text style={styles.headline}>{headline}</Text>

      {noTasks ? (
        <>
          <Text style={styles.subtitle}>No tenés tareas asignadas hoy</Text>
          <Pressable onPress={() => router.push("/(app)/plan")} style={styles.ctaRow}>
            <Text style={styles.ctaText}>Generar plan semanal</Text>
            <ChevronRight size={14} color={colors.primary} />
          </Pressable>
        </>
      ) : allDone ? (
        <>
          <Text style={styles.subtitle}>¡Completaste todas tus tareas de hoy!</Text>
          <Text style={styles.doneCount}>{doneCount} completada{doneCount !== 1 ? "s" : ""} ✓</Text>
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>
            {pending.length === 1
              ? "Tenés 1 tarea para hoy"
              : `Tenés ${pending.length} tareas para hoy`}
          </Text>

          <View style={styles.taskList}>
            {pending.map((a) => (
              <View key={a.id} style={styles.taskRow}>
                <Pressable
                  onPress={() => handleComplete(a.id)}
                  style={styles.checkCircle}
                  hitSlop={8}
                >
                  <Check size={12} color={colors.primary} strokeWidth={3} style={{ opacity: 0.3 }} />
                </Pressable>
                <Text style={styles.taskName} numberOfLines={1}>{a.task.name}</Text>
                {a.task.estimatedMinutes ? (
                  <View style={styles.timeRow}>
                    <Clock size={11} color={colors.mutedForeground} />
                    <Text style={styles.timeText}>{a.task.estimatedMinutes}m</Text>
                  </View>
                ) : null}
              </View>
            ))}

            {doneCount > 0 ? (
              <Text style={styles.doneCount}>{doneCount} completada{doneCount !== 1 ? "s" : ""} ✓</Text>
            ) : null}
          </View>

          <Pressable onPress={() => router.push("/(app)/tasks")} style={styles.ctaRow}>
            <Text style={styles.ctaText}>Ver todas</Text>
            <ChevronRight size={14} color={colors.primary} />
          </Pressable>
        </>
      )}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: `${c.primary}0F`,
      borderRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    headline: {
      fontFamily: "Caveat",
      fontSize: 26,
      color: c.primary,
    },
    subtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
      marginTop: 4,
    },
    taskList: {
      marginTop: spacing.sm,
      gap: 2,
    },
    taskRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: 8,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.lg,
    },
    checkCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: `${c.primary}60`,
      alignItems: "center",
      justifyContent: "center",
    },
    taskName: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "500",
      color: c.text,
      flex: 1,
    },
    timeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    timeText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.mutedForeground,
    },
    doneCount: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      paddingHorizontal: spacing.sm,
      marginTop: 4,
    },
    ctaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: spacing.sm,
    },
    ctaText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "600",
      color: c.primary,
    },
  });
}
