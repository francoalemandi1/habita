import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Avatar, SplitBar } from "@/components/ds";
import { useMembers } from "@/hooks/use-members";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useStats } from "@/hooks/use-stats";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

/** Tareas "Reparto" (handoff §5.3, replaces progress.tsx): done counts per member + SplitBar. */
export function RepartoView(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { me, activeHouseholdId } = useMobileAuth();
  const membersQuery = useMembers();
  const statsQuery = useStats();

  const currentMemberId = me?.members.find((m) => m.householdId === activeHouseholdId)?.id ?? "";
  const members = membersQuery.data?.members ?? [];
  const memberStats = statsQuery.data?.memberStats ?? [];
  const weeklyById = new Map(memberStats.map((m) => [m.id, m.weeklyTasks]));

  const weeklyValues = members.map((m) => weeklyById.get(m.id) ?? 0);
  const weeklyTotal = weeklyValues.reduce((sum, v) => sum + v, 0);

  if (statsQuery.isLoading) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.title}>Esta semana</Text>
        <SplitBar values={weeklyValues} total={Math.max(weeklyTotal, 1)} accessibilityLabel="Reparto de tareas de la semana" />
      </View>

      {members.map((member) => {
        const weekly = weeklyById.get(member.id) ?? 0;
        const monthly = memberStats.find((m) => m.id === member.id)?.monthlyTasks ?? 0;
        return (
          <View key={member.id} style={styles.row}>
            <Avatar name={member.name} size={40} isCurrentUser={member.id === currentMemberId} />
            <View style={styles.rowText}>
              <Text style={styles.name}>{member.id === currentMemberId ? "Vos" : member.name}</Text>
              <Text style={styles.meta}>{weekly} esta semana · {monthly} este mes</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    summary: {
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    title: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 22,
      color: c.ink,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 60,
    },
    rowText: {
      gap: 2,
    },
    name: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 16,
      color: c.ink,
    },
    meta: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
  });
}
