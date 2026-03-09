import { useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TrendingUp } from "lucide-react-native";
import { useStats } from "@/hooks/use-stats";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SecondaryHeader } from "@/components/ui/secondary-header";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { StatsResponse } from "@habita/contracts";

const MEMBER_TYPE_LABELS: Record<string, string> = { ADULT: "Adulto", TEEN: "Adolescente", CHILD: "Ni\u00F1o/a" };

function medalEmoji(rank: number): string {
  if (rank === 1) return "\uD83E\uDD47"; if (rank === 2) return "\uD83E\uDD48"; if (rank === 3) return "\uD83E\uDD49"; return `#${rank}`;
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${pct}%` as `${number}%` }]} />
    </View>
  );
}

interface MemberCardProps {
  member: StatsResponse["memberStats"][number];
  rank: number; maxWeekly: number; maxMonthly: number; isMe: boolean;
}

function MemberCard({ member, rank, maxWeekly, maxMonthly, isMe }: MemberCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Card style={[styles.memberCard, isMe && styles.memberCardMe]}>
      <CardContent>
        <View style={styles.memberCardHeader}>
          <View style={styles.memberCardLeft}>
            <Text style={styles.memberMedal}>{medalEmoji(rank)}</Text>
            <View>
              <Text style={styles.memberName}>{member.name}{isMe ? "  (vos)" : ""}</Text>
              <Text style={styles.memberType}>{MEMBER_TYPE_LABELS[member.memberType] ?? member.memberType}</Text>
            </View>
          </View>
          <Text style={styles.memberWeekly}>{member.weeklyTasks}</Text>
        </View>
        <View style={styles.memberStats}>
          <View style={styles.memberStatRow}>
            <View style={styles.memberStatLabels}>
              <Text style={styles.memberStatLabel}>Esta semana</Text>
              <Text style={styles.memberStatValue}>{member.weeklyTasks}</Text>
            </View>
            <MiniBar value={member.weeklyTasks} max={maxWeekly} />
          </View>
          <View style={styles.memberStatRow}>
            <View style={styles.memberStatLabels}>
              <Text style={styles.memberStatLabel}>Este mes</Text>
              <Text style={styles.memberStatValue}>{member.monthlyTasks}</Text>
            </View>
            <MiniBar value={member.monthlyTasks} max={maxMonthly} />
          </View>
          <Text style={styles.memberTotal}>Total hist\u00F3rico: {member.totalTasks} tareas</Text>
        </View>
      </CardContent>
    </Card>
  );
}

export default function ProgressScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const statsQuery = useStats();
  const { me, activeHouseholdId } = useMobileAuth();
  const myMemberId = me?.members.find((m) => m.householdId === activeHouseholdId)?.id;
  const sorted = [...(statsQuery.data?.memberStats ?? [])].sort((a, b) => b.weeklyTasks - a.weeklyTasks);
  const maxWeekly = sorted[0]?.weeklyTasks ?? 1;
  const maxMonthly = Math.max(...sorted.map((m) => m.monthlyTasks), 1);
  const totals = statsQuery.data?.totals;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SecondaryHeader title="Progreso familiar" />
      <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={statsQuery.isRefetching} onRefresh={() => void statsQuery.refetch()} tintColor={colors.primary} />}
      >
        <Text style={styles.subtitle}>Ranking semanal del hogar.</Text>
        {totals ? (
          <View style={styles.statChips}>
            <Card style={styles.statChip}><CardContent><Text style={styles.statChipLabel}>Completadas</Text><Text style={[styles.statChipValue, { color: colors.successText }]}>{totals.completed}</Text></CardContent></Card>
            <Card style={styles.statChip}><CardContent><Text style={styles.statChipLabel}>Pendientes</Text><Text style={[styles.statChipValue, { color: colors.warningText }]}>{totals.pending}</Text></CardContent></Card>
            <Card style={styles.statChip}><CardContent><Text style={styles.statChipLabel}>Miembros</Text><Text style={styles.statChipValue}>{totals.members}</Text></CardContent></Card>
          </View>
        ) : null}
        {statsQuery.isLoading ? (
          <View style={styles.loadingList}><SkeletonCard /><SkeletonCard /></View>
        ) : statsQuery.isError ? (
          <Card style={styles.errorCard}><CardContent><Text style={styles.errorText}>{getMobileErrorMessage(statsQuery.error)}</Text></CardContent></Card>
        ) : sorted.length === 0 ? (
          <EmptyState icon={<TrendingUp size={32} color={colors.mutedForeground} />} title="Sin estad\u00EDsticas" subtitle="Complet\u00E1 tareas para ver el progreso del hogar" />
        ) : (
          sorted.map((member, index) => (
            <MemberCard key={member.id} member={member} rank={index + 1} maxWeekly={maxWeekly} maxMonthly={maxMonthly} isMe={member.id === myMemberId} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 24 },
    subtitle: { fontFamily: fontFamily.sans, fontSize: 14, color: c.mutedForeground, marginBottom: spacing.md },
    statChips: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
    statChip: { flex: 1 },
    statChipLabel: { fontFamily: fontFamily.sans, fontSize: 11, color: c.mutedForeground },
    statChipValue: { fontFamily: fontFamily.sans, fontSize: 20, fontWeight: "700", color: c.text, marginTop: 2 },
    loadingList: { gap: spacing.md },
    errorCard: { backgroundColor: c.errorBg },
    errorText: { fontFamily: fontFamily.sans, color: c.errorText, fontSize: 14 },
    memberCard: { marginBottom: spacing.md },
    memberCardMe: { borderWidth: 2, borderColor: c.primary },
    memberCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
    memberCardLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    memberMedal: { fontFamily: fontFamily.sans, fontSize: 20 },
    memberName: { fontFamily: fontFamily.sans, fontWeight: "700", color: c.text, fontSize: 15 },
    memberType: { fontFamily: fontFamily.sans, color: c.mutedForeground, fontSize: 12 },
    memberWeekly: { fontFamily: fontFamily.sans, fontSize: 22, fontWeight: "700", color: c.text },
    memberStats: { gap: spacing.sm },
    memberStatRow: {},
    memberStatLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
    memberStatLabel: { fontFamily: fontFamily.sans, fontSize: 12, color: c.mutedForeground },
    memberStatValue: { fontFamily: fontFamily.sans, fontSize: 12, fontWeight: "600", color: c.text },
    memberTotal: { fontFamily: fontFamily.sans, fontSize: 11, color: c.mutedForeground, marginTop: 4 },
    barTrack: { height: 6, backgroundColor: c.border, borderRadius: 3, overflow: "hidden" },
    barFill: { height: "100%", backgroundColor: c.primary, borderRadius: 3 },
  });
}
