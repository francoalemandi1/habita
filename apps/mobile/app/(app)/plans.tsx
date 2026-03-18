import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  XCircle,
} from "lucide-react-native";
import { usePlanHistory } from "@/hooks/use-plans";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SecondaryHeader } from "@/components/ui/secondary-header";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, spacing } from "@/theme";

import type { PlanSummary } from "@/hooks/use-plans";
import type { ThemeColors } from "@/theme";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function durationLabel(days: number): string {
  if (days === 7) return "1 semana";
  if (days === 14) return "2 semanas";
  return `${days} días`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type PlanStatus = PlanSummary["status"];

const STATUS_CONFIG: Record<PlanStatus, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: "Pendiente", color: "warningText", bgColor: "warningBg" },
  APPLIED: { label: "Aplicado", color: "successText", bgColor: "successBg" },
  COMPLETED: { label: "Finalizado", color: "successText", bgColor: "successBg" },
  EXPIRED: { label: "Expirado", color: "mutedForeground", bgColor: "border" },
  REJECTED: { label: "Rechazado", color: "mutedForeground", bgColor: "border" },
};

function getScoreColor(score: number, colors: ThemeColors): string {
  if (score >= 80) return colors.successText;
  if (score >= 60) return colors.warningText;
  return colors.errorText;
}

// ─── Plan Card ───────────────────────────────────────────────────────────────

function StatusIcon({ status, size, colors }: { status: PlanStatus; size: number; colors: ThemeColors }) {
  const cfg = STATUS_CONFIG[status];
  const color = colors[cfg.color as keyof ThemeColors] as string;
  if (status === "COMPLETED" || status === "APPLIED") return <CheckCircle2 size={size} color={color} />;
  if (status === "REJECTED") return <XCircle size={size} color={color} />;
  return <Clock size={size} color={color} />;
}

function PlanCard({ plan }: { plan: PlanSummary }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);

  const assignments = plan.assignments;
  const taskCount = assignments.length;
  const memberNames = [...new Set(assignments.map((a) => a.memberName))];
  const cfg = STATUS_CONFIG[plan.status];

  // Group assignments by member
  const byMember = useMemo(() => {
    const map = new Map<string, typeof assignments>();
    for (const a of assignments) {
      const list = map.get(a.memberName) ?? [];
      list.push(a);
      map.set(a.memberName, list);
    }
    return map;
  }, [assignments]);

  return (
    <Card style={styles.planCard}>
      <CardContent>
        <Pressable onPress={() => setExpanded((v) => !v)} style={styles.planCardHeader}>
          <View style={[styles.statusDot, { backgroundColor: colors[cfg.bgColor as keyof ThemeColors] as string }]}>
            <StatusIcon status={plan.status} size={16} colors={colors} />
          </View>
          <View style={styles.planCardInfo}>
            <View style={styles.planCardTitleRow}>
              <Text style={styles.planCardTitle}>
                Plan de {durationLabel(plan.durationDays)}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: colors[cfg.bgColor as keyof ThemeColors] as string }]}>
                <Text style={[styles.statusBadgeText, { color: colors[cfg.color as keyof ThemeColors] as string }]}>
                  {cfg.label}
                </Text>
              </View>
            </View>
            <Text style={styles.planCardMeta}>
              {formatDate(plan.createdAt)} · {taskCount} {taskCount === 1 ? "tarea" : "tareas"} · {memberNames.length} {memberNames.length === 1 ? "miembro" : "miembros"}
            </Text>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Equidad</Text>
              <Text style={[styles.scoreValue, { color: getScoreColor(plan.balanceScore, colors) }]}>
                {plan.balanceScore}%
              </Text>
            </View>
            <View style={styles.scoreBarTrack}>
              <View
                style={[
                  styles.scoreBarFill,
                  {
                    width: `${plan.balanceScore}%` as `${number}%`,
                    backgroundColor: getScoreColor(plan.balanceScore, colors),
                  },
                ]}
              />
            </View>
          </View>
          <ChevronDown
            size={18}
            color={colors.mutedForeground}
            style={expanded ? { transform: [{ rotate: "180deg" }] } : undefined}
          />
        </Pressable>

        {expanded && (
          <View style={styles.expandedContent}>
            {/* Dates */}
            <View style={styles.datesRow}>
              <Text style={styles.dateText}>Creado: {formatDate(plan.createdAt)}</Text>
              {plan.appliedAt ? (
                <Text style={styles.dateText}>Aplicado: {formatDate(plan.appliedAt)}</Text>
              ) : null}
              <Text style={styles.dateText}>Expiración: {formatDate(plan.expiresAt)}</Text>
            </View>

            {/* Assignments by member */}
            {Array.from(byMember.entries()).map(([memberName, memberAssignments]) => (
              <View key={memberName} style={styles.memberBlock}>
                <View style={styles.memberHeader}>
                  <Text style={styles.memberName}>{memberName}</Text>
                  <Text style={styles.memberCount}>({memberAssignments.length})</Text>
                </View>
                {memberAssignments.map((a) => (
                  <View key={`${a.taskName}|${a.memberName}`} style={styles.taskRow}>
                    <CheckCircle2 size={12} color={colors.successText} />
                    <Text style={styles.taskName}>{a.taskName}</Text>
                  </View>
                ))}
              </View>
            ))}

            {/* Notes */}
            {plan.notes.length > 0 && (
              <View style={styles.notesBlock}>
                <Text style={styles.notesTitle}>Notas</Text>
                {plan.notes.map((note, idx) => (
                  <Text key={idx} style={styles.noteText}>• {note}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PlansScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const plansQuery = usePlanHistory();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SecondaryHeader title="Historial de planes" />
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={plansQuery.isRefetching}
            onRefresh={() => void plansQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.subtitle}>
          Revisá los planes de distribución de tareas anteriores.
        </Text>

        {plansQuery.isLoading ? (
          <View style={styles.loadingList}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : plansQuery.isError ? (
          <Card style={styles.errorCard}>
            <CardContent>
              <Text style={styles.errorText}>
                {getMobileErrorMessage(plansQuery.error)}
              </Text>
            </CardContent>
          </Card>
        ) : !plansQuery.data || plansQuery.data.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={32} color={colors.mutedForeground} />}
            title="Sin planes anteriores"
            subtitle="Cuando completes tu primer plan, aparecerá acá para que puedas comparar semana a semana."
          />
        ) : (
          plansQuery.data.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 24 },
    subtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.mutedForeground,
      marginBottom: spacing.md,
    },
    loadingList: { gap: spacing.md },
    errorCard: { backgroundColor: c.errorBg },
    errorText: { fontFamily: fontFamily.sans, color: c.errorText, fontSize: 14 },
    // Plan card
    planCard: { marginBottom: spacing.md },
    planCardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
    },
    statusDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    planCardInfo: { flex: 1 },
    planCardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      flexWrap: "wrap",
    },
    planCardTitle: {
      fontFamily: fontFamily.sans,
      fontWeight: "600",
      fontSize: 15,
      color: c.text,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    statusBadgeText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "600",
    },
    planCardMeta: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      marginTop: 2,
    },
    scoreRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: spacing.sm,
    },
    scoreLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
    },
    scoreValue: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "700",
    },
    scoreBarTrack: {
      height: 4,
      backgroundColor: c.border,
      borderRadius: 2,
      overflow: "hidden",
      marginTop: 4,
    },
    scoreBarFill: {
      height: "100%",
      borderRadius: 2,
    },
    // Expanded content
    expandedContent: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    datesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    dateText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.mutedForeground,
    },
    memberBlock: {
      backgroundColor: c.background,
      borderRadius: 10,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    memberHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: 4,
    },
    memberName: {
      fontFamily: fontFamily.sans,
      fontWeight: "700",
      fontSize: 13,
      color: c.text,
    },
    memberCount: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
    },
    taskRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 2,
    },
    taskName: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      color: c.text,
    },
    notesBlock: {
      marginTop: spacing.sm,
    },
    notesTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "600",
      color: c.mutedForeground,
      marginBottom: 4,
    },
    noteText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      marginBottom: 2,
    },
  });
}
