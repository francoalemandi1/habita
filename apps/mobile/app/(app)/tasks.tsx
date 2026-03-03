import { useMemo, useState } from "react";
import { router } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CalendarRange, Check, ClipboardList, Clock, Dices, Loader2, Undo2 } from "lucide-react-native";
import {
  useCompleteAssignment,
  useMyAssignments,
  useUncompleteAssignment,
  useVerifyAssignment,
} from "@/hooks/use-assignments";
import { useCreateTransfer } from "@/hooks/use-transfers";
import { useMembers } from "@/hooks/use-members";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { StyledTextInput } from "@/components/ui/text-input";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { ScreenHeader } from "@/components/features/screen-header";
import { colors, fontFamily, radius, spacing, assignmentCardColors, typography } from "@/theme";

import type { AssignmentSummary } from "@habita/contracts";

// ─── helpers ─────────────────────────────────────────────────────────────────

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  ONCE: "Una vez",
};

function isCompletedStatus(status: AssignmentSummary["status"]): boolean {
  return status === "COMPLETED" || status === "VERIFIED";
}

function dayKey(dateValue: string | Date): string {
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getCardColorIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % assignmentCardColors.length;
}

function formatDueLabel(dueDate: string): string | null {
  const due = new Date(dueDate);
  const isToday = due.toDateString() === new Date().toDateString();
  if (isToday) return "Hoy";
  return due.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

// ─── WeekCalendar ────────────────────────────────────────────────────────────

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function getWeekDays(): { date: Date; label: string; key: string; isToday: boolean }[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return {
      date,
      label: DAY_LABELS[date.getDay()]!,
      key: dayKey(date),
      isToday: dayKey(date) === dayKey(today),
    };
  });
}

function WeekCalendar({
  selectedDay,
  onSelectDay,
  assignmentCountByDay,
}: {
  selectedDay: string;
  onSelectDay: (key: string) => void;
  assignmentCountByDay: Record<string, number>;
}) {
  const weekDays = useMemo(getWeekDays, []);

  return (
    <View style={styles.weekCalendar}>
      {weekDays.map((day) => {
        const isSelected = selectedDay === day.key;
        const count = assignmentCountByDay[day.key] ?? 0;
        return (
          <Pressable
            key={day.key}
            onPress={() => onSelectDay(day.key)}
            style={[
              styles.dayPill,
              isSelected && styles.dayPillSelected,
              day.isToday && !isSelected && styles.dayPillToday,
            ]}
          >
            <Text
              style={[
                styles.dayLabel,
                isSelected && styles.dayLabelSelected,
              ]}
            >
              {day.label}
            </Text>
            <Text
              style={[
                styles.dayNumber,
                isSelected && styles.dayNumberSelected,
              ]}
            >
              {day.date.getDate()}
            </Text>
            {count > 0 ? (
              <View style={[styles.dayDot, isSelected && styles.dayDotSelected]} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── AssignmentCard ───────────────────────────────────────────────────────────

interface AssignmentCardProps {
  assignment: AssignmentSummary;
  colorIndex: number;
  onComplete: () => void;
  onUncomplete: () => void;
  onVerify: () => void;
  onTransfer: () => void;
  isMutating: boolean;
  isCompleting: boolean;
  isUncompleting: boolean;
  canVerify: boolean;
}

function AssignmentCard({
  assignment,
  colorIndex,
  onComplete,
  onUncomplete,
  onTransfer,
  isMutating,
  isCompleting,
  isUncompleting,
  canVerify,
}: AssignmentCardProps) {
  const isCompleted = isCompletedStatus(assignment.status);
  const awaitingVerify = assignment.status === "COMPLETED" && canVerify;
  const scheme = assignmentCardColors[colorIndex % assignmentCardColors.length]!;

  const dueDateLabel = formatDueLabel(assignment.dueDate);
  const freqLabel = FREQUENCY_LABELS[assignment.task.frequency] ?? assignment.task.frequency;
  const minutes = assignment.task.estimatedMinutes;

  return (
    <View
      style={[
        styles.assignmentCard,
        { backgroundColor: isCompleted ? "#f0fdf4" : scheme.bg },
      ]}
    >
      {/* Decorative circles */}
      {!isCompleted ? (
        <>
          <View style={styles.decorativeCircleTopRight} />
          <View style={styles.decorativeCircleBottomLeft} />
        </>
      ) : null}

      <View style={styles.assignmentContent}>
        {/* Title */}
        <Text
          style={[
            styles.assignmentTitle,
            isCompleted && styles.assignmentTitleCompleted,
            { color: isCompleted ? "#166534" : scheme.text },
          ]}
          numberOfLines={2}
        >
          {assignment.task.name}
        </Text>

        {/* Description */}
        {assignment.task.description && !isCompleted ? (
          <Text style={[styles.assignmentDesc, { color: `${scheme.meta}` }]}>
            {assignment.task.description}
          </Text>
        ) : null}

        {/* Metadata row */}
        <View style={styles.metadataRow}>
          <Clock
            size={14}
            color={isCompleted ? "#15803d" : scheme.meta}
          />
          <Text
            style={[
              styles.metadataText,
              { color: isCompleted ? "#15803d" : scheme.meta },
            ]}
          >
            {dueDateLabel && !isCompleted ? `${dueDateLabel} · ` : ""}
            {freqLabel}
            {minutes ? ` · ${minutes} min` : ""}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.assignmentActions}>
          {isCompleted ? (
            <Pressable
              disabled={isMutating}
              onPress={onUncomplete}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: "rgba(22, 101, 52, 0.1)",
                  opacity: isMutating ? 0.6 : 1,
                },
              ]}
            >
              {isUncompleting ? (
                <Loader2 size={14} color="#15803d" />
              ) : (
                <Undo2 size={14} color="#15803d" />
              )}
              <Text style={[styles.actionBtnText, { color: "#15803d" }]}>
                {isUncompleting ? "Desmarcando..." : "Desmarcar"}
              </Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                disabled={isMutating}
                onPress={onComplete}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: `${scheme.btnBg}`,
                    opacity: isMutating ? 0.6 : 1,
                  },
                ]}
              >
                {isCompleting ? (
                  <Loader2 size={14} color={scheme.text} />
                ) : (
                  <Check size={14} color={scheme.text} strokeWidth={3} />
                )}
                <Text style={[styles.actionBtnText, { color: scheme.text }]}>
                  {isCompleting ? "Completando..." : "Completar"}
                </Text>
              </Pressable>

              <Pressable
                disabled={isMutating}
                onPress={onTransfer}
                style={[
                  styles.actionBtn,
                  { backgroundColor: `${scheme.text}12`, opacity: isMutating ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.actionBtnText, { color: scheme.text }]}>
                  Transferir
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── CompletedCard (compact green row) ───────────────────────────────────────

function CompletedCard({
  assignment,
  onUncomplete,
  isUncompleting,
}: {
  assignment: AssignmentSummary;
  onUncomplete: () => void;
  isUncompleting: boolean;
}) {
  const freqLabel = FREQUENCY_LABELS[assignment.task.frequency] ?? assignment.task.frequency;
  return (
    <View style={styles.completedRow}>
      <View style={styles.completedCheckBg}>
        <Check size={14} color="#16a34a" strokeWidth={3} />
      </View>
      <View style={styles.completedTextContainer}>
        <Text style={styles.completedName} numberOfLines={1}>{assignment.task.name}</Text>
        <Text style={styles.completedFreq}>{freqLabel}</Text>
      </View>
      <Pressable
        onPress={onUncomplete}
        disabled={isUncompleting}
        style={styles.completedUndoBtn}
        hitSlop={8}
      >
        {isUncompleting ? (
          <Loader2 size={16} color="#15803d" />
        ) : (
          <Undo2 size={16} color="#15803d" />
        )}
      </Pressable>
    </View>
  );
}

// ─── TransferSheet ────────────────────────────────────────────────────────────

function TransferSheet({ assignment, onClose }: { assignment: AssignmentSummary; onClose: () => void }) {
  const membersQuery = useMembers();
  const createTransfer = useCreateTransfer();
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const members = (membersQuery.data?.members ?? []).filter((m) => m.id !== assignment.memberId);

  const handleSend = async () => {
    setError(null);
    if (!selectedMemberId) { setError("Seleccioná a quién transferir."); return; }
    try {
      await createTransfer.mutateAsync({
        assignmentId: assignment.id,
        toMemberId: selectedMemberId,
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(getMobileErrorMessage(err));
    }
  };

  return (
    <BottomSheet visible onClose={onClose} title={`Transferir: ${assignment.task.name}`}>
      <View style={styles.sheetBody}>
        <Text style={styles.sheetLabel}>Transferir a</Text>
        {membersQuery.isLoading ? (
          <Text style={styles.sheetMuted}>Cargando miembros...</Text>
        ) : members.length === 0 ? (
          <Text style={styles.sheetMuted}>No hay otros miembros disponibles.</Text>
        ) : (
          <View style={styles.memberList}>
            {members.map((member) => {
              const isSelected = member.id === selectedMemberId;
              return (
                <Pressable
                  key={member.id}
                  onPress={() => setSelectedMemberId(member.id)}
                  style={[styles.memberItem, isSelected && { borderColor: colors.primary, backgroundColor: "#eff6ff" }]}
                >
                  <Text style={[styles.memberName, isSelected && { color: colors.primary, fontWeight: "700" }]}>
                    {member.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
        <StyledTextInput value={reason} onChangeText={setReason} placeholder="Motivo (opcional)" />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.sheetActions}>
          <Button variant="ghost" onPress={onClose} style={{ flex: 1 }}>Cancelar</Button>
          <Button onPress={() => void handleSend()} loading={createTransfer.isPending} disabled={!selectedMemberId} style={{ flex: 2 }}>
            Enviar solicitud
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const { me } = useMobileAuth();
  const { data, isLoading, isError, error, refetch } = useMyAssignments();
  const completeMutation = useCompleteAssignment();
  const uncompleteMutation = useUncompleteAssignment();
  const verifyMutation = useVerifyAssignment();
  const [transferTarget, setTransferTarget] = useState<AssignmentSummary | null>(null);
  const [selectedDay, setSelectedDay] = useState(dayKey(new Date()));

  const isAdult = useMemo(
    () => me?.members.some((m) => m.householdId === me.activeHouseholdId) ?? false,
    [me],
  );

  const allPending = useMemo(
    () => (data?.pending ?? []),
    [data],
  );

  const allCompleted = useMemo(
    () => (data?.completed ?? []),
    [data],
  );

  // Count assignments per day for the calendar dots
  const assignmentCountByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of allPending) {
      const key = dayKey(a.dueDate);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [allPending]);

  // Filter by selected day
  const pendingAssignments = useMemo(
    () => allPending.filter((a) => dayKey(a.dueDate) === selectedDay),
    [allPending, selectedDay],
  );

  const completedTodayAssignments = useMemo(
    () => allCompleted.filter((a) => {
      return dayKey(a.completedAt ?? a.dueDate) === selectedDay;
    }),
    [allCompleted, selectedDay],
  );

  const allDone = !isLoading && pendingAssignments.length === 0;

  const renderPendingCard = (assignment: AssignmentSummary) => {
    const isCurrentCompleting = completeMutation.isPending && completeMutation.variables === assignment.id;
    const isCurrentUncompleting = uncompleteMutation.isPending && uncompleteMutation.variables === assignment.id;
    return (
      <AssignmentCard
        key={assignment.id}
        assignment={assignment}
        colorIndex={getCardColorIndex(assignment.id)}
        isMutating={isCurrentCompleting || isCurrentUncompleting}
        isCompleting={isCurrentCompleting}
        isUncompleting={isCurrentUncompleting}
        canVerify={isAdult}
        onComplete={() => completeMutation.mutate(assignment.id)}
        onUncomplete={() => uncompleteMutation.mutate(assignment.id)}
        onVerify={() => {}}
        onTransfer={() => setTransferTarget(assignment)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <ClipboardList size={24} color={colors.primary} />
          <Text style={styles.headerTitle}>Mis tareas</Text>
          <View style={styles.headerSpacer} />
          <Pressable
            onPress={() => router.push("/(app)/weekly-plan")}
            style={styles.planCta}
          >
            <CalendarRange size={14} color="#ffffff" />
            <Text style={styles.planCtaText}>Plan semanal</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(app)/roulette")}
            style={styles.rouletteCta}
          >
            <Dices size={16} color={colors.primary} />
            <Text style={styles.rouletteCtaText}>Ruleta</Text>
          </Pressable>
        </View>
      </View>

      {/* Week calendar */}
      <WeekCalendar
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        assignmentCountByDay={assignmentCountByDay}
      />

      {/* Content */}
      {isLoading ? (
        <ScrollView bounces={false} contentContainerStyle={styles.scrollContent}>
          <SkeletonCard style={styles.skeleton} />
          <SkeletonCard lines={2} style={styles.skeleton} />
          <SkeletonCard style={styles.skeleton} />
        </ScrollView>
      ) : isError ? (
        <Card style={styles.errorCard}>
          <CardContent>
            <Text style={styles.errorText}>{getMobileErrorMessage(error)}</Text>
            <Button variant="ghost" onPress={() => void refetch()} style={{ marginTop: spacing.sm }}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : allDone && completedTodayAssignments.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={32} color={colors.primary} />}
          title="¡Estás al día!"
          subtitle="No tenés tareas pendientes. ¡Buen trabajo!"
        />
      ) : (
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              tintColor={colors.primary}
              onRefresh={() => void refetch()}
            />
          }
        >
          {/* Pending assignment cards with negative margin stacking */}
          {pendingAssignments.length > 0 ? (
            <View style={styles.cardStack}>
              {pendingAssignments.map(renderPendingCard)}
            </View>
          ) : null}

          {/* Completed today section */}
          {completedTodayAssignments.length > 0 ? (
            <View style={styles.completedSection}>
              <Text style={styles.completedSectionLabel}>
                Completadas hoy
              </Text>
              <View style={styles.completedList}>
                {completedTodayAssignments.map((a) => (
                  <CompletedCard
                    key={a.id}
                    assignment={a}
                    onUncomplete={() => uncompleteMutation.mutate(a.id)}
                    isUncompleting={uncompleteMutation.isPending && uncompleteMutation.variables === a.id}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {transferTarget ? (
        <TransferSheet assignment={transferTarget} onClose={() => setTransferTarget(null)} />
      ) : null}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.pageTitle,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 24,
  },
  skeleton: {
    marginBottom: spacing.sm,
  },
  errorCard: {
    margin: spacing.lg,
  },
  errorText: {
    fontFamily: fontFamily.sans,
    color: colors.destructive,
    fontSize: 13,
  },

  // Card stack with slight negative margin overlap
  cardStack: {
    gap: -4,
  },

  // Assignment card
  assignmentCard: {
    borderRadius: radius["2xl"],
    overflow: "hidden",
    marginBottom: 0,
  },
  decorativeCircleTopRight: {
    position: "absolute",
    right: -32,
    top: -32,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  decorativeCircleBottomLeft: {
    position: "absolute",
    left: -24,
    bottom: -24,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  assignmentContent: {
    padding: spacing.lg + 4,
  },
  assignmentTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
  },
  assignmentTitleCompleted: {
    textDecorationLine: "line-through",
    textDecorationColor: "rgba(74, 222, 128, 0.5)",
  },
  assignmentDesc: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.md,
  },
  metadataText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
  },
  assignmentActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  actionBtnText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: "600",
  },

  // Completed today section
  completedSection: {
    marginTop: spacing.xxl,
  },
  completedSectionLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: "500",
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  completedList: {
    gap: spacing.sm,
  },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  completedCheckBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(22, 163, 74, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  completedTextContainer: {
    flex: 1,
    gap: 1,
  },
  completedName: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: "500",
    color: "#166534",
    textDecorationLine: "line-through",
    textDecorationColor: "rgba(74, 222, 128, 0.5)",
  },
  completedFreq: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: "#15803d",
  },
  completedUndoBtn: {
    padding: 6,
    borderRadius: 999,
    flexShrink: 0,
  },

  // Sheet styles
  sheetBody: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  sheetLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  sheetMuted: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  sheetActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  memberList: {
    gap: spacing.xs,
  },
  memberItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
  },
  memberName: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  // Header extras
  headerSpacer: {
    flex: 1,
  },
  planCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: spacing.sm,
  },
  planCtaText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
  },
  rouletteCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${colors.primary}15`,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rouletteCtaText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },

  // Week calendar
  weekCalendar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: 4,
  },
  dayPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: radius.lg,
  },
  dayPillSelected: {
    backgroundColor: colors.primary,
  },
  dayPillToday: {
    backgroundColor: `${colors.primary}15`,
  },
  dayLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: "500",
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  dayLabelSelected: {
    color: "#ffffff",
  },
  dayNumber: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  dayNumberSelected: {
    color: "#ffffff",
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 3,
  },
  dayDotSelected: {
    backgroundColor: "#ffffff",
  },

  bottomPadding: {
    height: 20,
  },
});
