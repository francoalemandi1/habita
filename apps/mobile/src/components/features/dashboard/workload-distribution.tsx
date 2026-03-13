import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";

interface MemberStat {
  id: string;
  name: string;
  weeklyTasks: number;
  weeklyPoints: number;
}

interface Props {
  memberStats: MemberStat[];
}

export function WorkloadDistribution({ memberStats }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Only render for multi-member households
  if (memberStats.length < 2) return null;

  const maxTasks = Math.max(...memberStats.map((m) => m.weeklyTasks), 1);
  const avg = memberStats.reduce((sum, m) => sum + m.weeklyTasks, 0) / memberStats.length;

  const sorted = [...memberStats].sort((a, b) => b.weeklyTasks - a.weeklyTasks);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Distribución de tareas</Text>
      <Text style={styles.subtitle}>Esta semana por persona</Text>

      <View style={styles.rows}>
        {sorted.map((member) => {
          const pct = maxTasks > 0 ? (member.weeklyTasks / maxTasks) * 100 : 0;
          const deviation = avg > 0 ? Math.abs(member.weeklyTasks - avg) / avg : 0;
          const isFair = deviation <= 0.2 && member.weeklyTasks > 0;

          return (
            <View key={member.id} style={styles.row}>
              {/* Avatar */}
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{member.name.charAt(0).toUpperCase()}</Text>
              </View>

              <View style={styles.barContainer}>
                <View style={styles.rowHeader}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.taskCount}>
                    {member.weeklyTasks} tarea{member.weeklyTasks !== 1 ? "s" : ""}
                    {isFair ? "  ✓" : ""}
                  </Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.bar, { width: `${pct}%` }]} />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {avg > 0 && (
        <Text style={styles.avgLabel}>
          Promedio: {avg.toFixed(1)} tarea{avg !== 1 ? "s" : ""} por persona
        </Text>
      )}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: radius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    title: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.text,
      marginBottom: 2,
    },
    subtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      marginBottom: spacing.md,
    },
    rows: {
      gap: spacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    avatarText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.primary,
    },
    barContainer: {
      flex: 1,
    },
    rowHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 3,
    },
    memberName: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "600",
      color: c.text,
    },
    taskCount: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.mutedForeground,
    },
    track: {
      height: 6,
      backgroundColor: c.muted,
      borderRadius: 3,
      overflow: "hidden",
    },
    bar: {
      height: 6,
      backgroundColor: c.primary,
      borderRadius: 3,
      opacity: 0.7,
    },
    avgLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.mutedForeground,
      marginTop: spacing.sm,
    },
  });
}
