import { useEffect, useMemo, useRef, useState } from "react";
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
import { CalendarDays, Check, CheckCircle2, ChevronRight, ClipboardList, Clock, Dices, History, Loader2, Undo2 } from "lucide-react-native";
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
import { useThemeColors } from "@/hooks/use-theme";
import { useCelebration } from "@/hooks/use-celebration";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { StyledTextInput } from "@/components/ui/text-input";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { TabBar } from "@/components/ui/tab-bar";
import { ScreenHeader } from "@/components/features/screen-header";
import { fontFamily, radius, spacing, assignmentCardColors, typography } from "@/theme";
import { useFirstVisit } from "@/hooks/use-first-visit";
import { SectionGuideCard } from "@/components/features/section-guide-card";
import { Sparkles, Users, Star } from "lucide-react-native";

import type { ThemeColors } from "@/theme";
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
  // Extract YYYY-MM-DD from ISO string directly to avoid local timezone shifting.
  // e.g. "2025-03-03T00:00:00.000Z" must always yield "2025-03-03", not "2025-03-02" in UTC-3.
  if (typeof dateValue === "string") {
    const isoDate = dateValue.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  }
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
  const todayKey = dayKey(new Date());
  if (dayKey(dueDate) === todayKey) return "Hoy";
  // Parse as local date to avoid timezone shift in display
  const parts = dueDate.slice(0, 10).split("-");
  const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return due.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

// ─── Dynamic date range helpers ──────────────────────────────────────────────

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface CalendarDay {
  date: Date;
  label: string;
  key: string;
  isToday: boolean;
}

/** Build day entries from startDate to endDate (inclusive) */
function getDateRangeDays(startDate: Date, endDate: Date): CalendarDay[] {
  const todayKey = dayKey(new Date());
  const days: CalendarDay[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const d = new Date(current);
    days.push({
      date: d,
      label: DAY_LABELS[d.getDay()]!,
      key: dayKey(d),
      isToday: dayKey(d) === todayKey,
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/** Parse an ISO date string as a local midnight Date to avoid timezone shifting */
function parseLocalDate(isoStr: string): Date {
  const parts = isoStr.slice(0, 10).split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/** Derive the date range from assignments, fallback to current Mon-Sun */
function computeCalendarRange(
  allPending: AssignmentSummary[],
  allCompleted: AssignmentSummary[],
): { startDate: Date; endDate: Date } {
  const allDates: Date[] = [];
  for (const a of allPending) allDates.push(parseLocalDate(a.dueDate));
  for (const a of allCompleted) allDates.push(parseLocalDate(a.dueDate));

  if (allDates.length > 0) {
    let minTime = allDates[0]!.getTime();
    let maxTime = allDates[0]!.getTime();
    for (const d of allDates) {
      const t = d.getTime();
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    }
    return { startDate: new Date(minTime), endDate: new Date(maxTime) };
  }

  // Fallback: current week Mon-Sun
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { startDate: monday, endDate: sunday };
}

// ─── DayCalendar ─────────────────────────────────────────────────────────────

const DAY_PILL_WIDTH = 48;
const SCROLLABLE_THRESHOLD = 7;

function DayCalendar({
  days,
  selectedDay,
  onSelectDay,
  assignmentCountByDay,
}: {
  days: CalendarDay[];
  selectedDay: string;
  onSelectDay: (key: string) => void;
  assignmentCountByDay: Record<string, number>;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);
  const isScrollable = days.length > SCROLLABLE_THRESHOLD;

  // Auto-scroll to selected day when it changes
  useEffect(() => {
    if (!isScrollable) return;
    const index = days.findIndex((d) => d.key === selectedDay);
    if (index >= 0 && scrollRef.current) {
      const targetX = Math.max(0, index * (DAY_PILL_WIDTH + 4) - 100);
      scrollRef.current.scrollTo({ x: targetX, animated: true });
    }
  }, [selectedDay, isScrollable, days]);

  const renderPills = () =>
    days.map((day) => {
      const isSelected = selectedDay === day.key;
      const count = assignmentCountByDay[day.key] ?? 0;
      return (
        <Pressable
          key={day.key}
          onPress={() => onSelectDay(day.key)}
          style={[
            isScrollable ? styles.dayPillFixed : styles.dayPill,
            isSelected && styles.dayPillSelected,
            day.isToday && !isSelected && styles.dayPillToday,
          ]}
        >
          <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
            {day.label}
          </Text>
          <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
            {day.date.getDate()}
          </Text>
          <View style={[styles.dayDot, count > 0 ? (isSelected ? styles.dayDotSelected : styles.dayDotVisible) : styles.dayDotHidden]} />
        </Pressable>
      );
    });

  if (isScrollable) {
    return (
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekCalendarScroll}
        style={styles.weekCalendarOuter}
      >
        {renderPills()}
      </ScrollView>
    );
  }

  return (
    <View style={styles.weekCalendar}>
      {renderPills()}
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        { backgroundColor: isCompleted ? colors.successBg : scheme.bg },
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
            { color: isCompleted ? colors.successText : scheme.text },
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
            color={isCompleted ? colors.successText : scheme.meta}
          />
          <Text
            style={[
              styles.metadataText,
              { color: isCompleted ? colors.successText : scheme.meta },
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
                  backgroundColor: `${colors.successText}1A`,
                  opacity: isMutating ? 0.6 : 1,
                },
              ]}
            >
              {isUncompleting ? (
                <Loader2 size={14} color={colors.successText} />
              ) : (
                <Undo2 size={14} color={colors.successText} />
              )}
              <Text style={[styles.actionBtnText, { color: colors.successText }]}>
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const freqLabel = FREQUENCY_LABELS[assignment.task.frequency] ?? assignment.task.frequency;
  return (
    <View style={styles.completedRow}>
      <View style={styles.completedCheckBg}>
        <Check size={14} color={colors.successText} strokeWidth={3} />
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
          <Loader2 size={16} color={colors.successText} />
        ) : (
          <Undo2 size={16} color={colors.successText} />
        )}
      </Pressable>
    </View>
  );
}

// ─── ListRow (compact row for list view) ─────────────────────────────────────

function formatDateHeader(dateStr: string): string {
  const todayKey = dayKey(new Date());
  const key = dayKey(dateStr);
  if (key === todayKey) return "Hoy";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (key === dayKey(tomorrow)) return "Mañana";
  // Parse as local date to avoid timezone shift in display
  const parts = dateStr.slice(0, 10).split("-");
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" });
}

function ListRow({
  assignment,
  onComplete,
  onTransfer,
  isCompleting,
  isMutating,
}: {
  assignment: AssignmentSummary;
  onComplete: () => void;
  onTransfer: () => void;
  isCompleting: boolean;
  isMutating: boolean;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const freqLabel = FREQUENCY_LABELS[assignment.task.frequency] ?? assignment.task.frequency;
  const minutes = assignment.task.estimatedMinutes;

  return (
    <View style={styles.listRow}>
      <Pressable
        onPress={onComplete}
        disabled={isMutating}
        style={[styles.listCheckbox, isMutating && { opacity: 0.5 }]}
        hitSlop={8}
      >
        {isCompleting ? (
          <Loader2 size={16} color={colors.primary} />
        ) : (
          <View style={styles.listCheckboxInner} />
        )}
      </Pressable>
      <View style={styles.listRowContent}>
        <Text style={styles.listRowTitle} numberOfLines={1}>
          {assignment.task.name}
        </Text>
        <Text style={styles.listRowMeta}>
          {freqLabel}{minutes ? ` · ${minutes} min` : ""}
        </Text>
      </View>
      <Pressable
        onPress={onTransfer}
        disabled={isMutating}
        style={styles.listRowAction}
        hitSlop={8}
      >
        <ChevronRight size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

// ─── TransferSheet ────────────────────────────────────────────────────────────

function TransferSheet({ assignment, onClose }: { assignment: AssignmentSummary; onClose: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
                  style={[styles.memberItem, isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
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

// ─── View mode ───────────────────────────────────────────────────────────────

type ViewMode = "calendar" | "list";

const VIEW_MODE_ITEMS = [
  { key: "calendar", label: "Calendario" },
  { key: "list", label: "Lista" },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const { me } = useMobileAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isFirstVisit, dismiss: dismissGuide } = useFirstVisit("tareas");
  const { data, isLoading, isError, error, refetch } = useMyAssignments();
  const completeMutation = useCompleteAssignment();
  const uncompleteMutation = useUncompleteAssignment();
  const verifyMutation = useVerifyAssignment();
  const { celebrate } = useCelebration();
  const completionCountRef = useRef(0);
  const allDoneCelebrationFiredRef = useRef(false);
  const [transferTarget, setTransferTarget] = useState<AssignmentSummary | null>(null);
  const [selectedDay, setSelectedDay] = useState(dayKey(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");

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

  const weeklyCompletedCount = allCompleted.length;

  const hasAnyAssignments = useMemo(
    () => allPending.length + allCompleted.length > 0,
    [allPending, allCompleted],
  );

  // Compute dynamic date range from assignments
  const calendarRange = useMemo(
    () => computeCalendarRange(allPending, allCompleted),
    [allPending, allCompleted],
  );

  const calendarDays = useMemo(
    () => getDateRangeDays(calendarRange.startDate, calendarRange.endDate),
    [calendarRange],
  );

  // Auto-select appropriate day when calendar range changes
  const [prevCalendarDays, setPrevCalendarDays] = useState(calendarDays);
  if (prevCalendarDays !== calendarDays) {
    setPrevCalendarDays(calendarDays);
    if (calendarDays.length > 0) {
      const todayStr = dayKey(new Date());
      const todayInRange = calendarDays.some((d) => d.key === todayStr);
      if (!todayInRange) {
        setSelectedDay(calendarDays[0]!.key);
      }
    }
  }

  // Count assignments per day for the calendar dots (pending + completed)
  const assignmentCountByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of [...allPending, ...allCompleted]) {
      const key = dayKey(a.dueDate);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [allPending, allCompleted]);

  // Filter by selected day (calendar mode)
  const pendingAssignments = useMemo(
    () => allPending.filter((a) => dayKey(a.dueDate) === selectedDay),
    [allPending, selectedDay],
  );

  const completedDayAssignments = useMemo(
    () => allCompleted.filter((a) => dayKey(a.completedAt ?? a.dueDate) === selectedDay),
    [allCompleted, selectedDay],
  );

  const allDone = !isLoading && pendingAssignments.length === 0;

  // Fire celebration toast once when all tasks for the day are done
  useEffect(() => {
    if (allDone && completedDayAssignments.length > 0 && !allDoneCelebrationFiredRef.current) {
      allDoneCelebrationFiredRef.current = true;
      celebrate("share-nudge");
    }
    if (!allDone) {
      allDoneCelebrationFiredRef.current = false;
    }
  }, [allDone, completedDayAssignments.length, celebrate]);

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
        onComplete={() => completeMutation.mutate(assignment.id, {
          onSuccess: () => {
            completionCountRef.current += 1;
            if (completionCountRef.current % 5 === 0) celebrate("share-nudge");
          },
        })}
        onUncomplete={() => uncompleteMutation.mutate(assignment.id)}
        onVerify={() => {}}
        onTransfer={() => setTransferTarget(assignment)}
      />
    );
  };

  // ─── Calendar view content ─────────────────────────────────────────────────

  const renderCalendarContent = () => {
    if (isLoading) {
      return (
        <ScrollView bounces={false} style={styles.flex1} contentContainerStyle={styles.scrollContent}>
          <SkeletonCard style={styles.skeleton} />
          <SkeletonCard lines={2} style={styles.skeleton} />
          <SkeletonCard style={styles.skeleton} />
        </ScrollView>
      );
    }

    if (isError) {
      return (
        <ScrollView bounces={false} style={styles.flex1} contentContainerStyle={styles.scrollContent}>
          <Card style={styles.errorCard}>
            <CardContent>
              <Text style={styles.errorText}>{getMobileErrorMessage(error)}</Text>
              <Button variant="ghost" onPress={() => void refetch()} style={{ marginTop: spacing.sm }}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </ScrollView>
      );
    }

    if (allDone && completedDayAssignments.length === 0) {
      if (!hasAnyAssignments) {
        return (
          <ScrollView bounces={false} style={styles.flex1} contentContainerStyle={styles.scrollContent}>
            <EmptyState
              icon={<ClipboardList size={32} color={colors.primary} />}
              title="No tenés un plan generado"
              subtitle="Generá un plan semanal para distribuir las tareas del hogar."
              actionLabel="Planificá"
              onAction={() => router.push("/(app)/plan")}
              steps={[
                { label: "Habita sugiere tareas para tu hogar" },
                { label: "Aceptá o personalizá las sugerencias" },
                { label: "Completá tareas y llevá el control" },
              ]}
            />
          </ScrollView>
        );
      }

      return (
        <ScrollView bounces={false} style={styles.flex1} contentContainerStyle={styles.scrollContent}>
          <EmptyState
            icon={<ClipboardList size={32} color={colors.primary} />}
            title="Sin tareas este día"
            subtitle="No hay tareas pendientes ni completadas."
          />
        </ScrollView>
      );
    }

    return (
      <ScrollView
        bounces={false}
        style={styles.flex1}
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
        {allDone && completedDayAssignments.length > 0 ? (
          <Card style={styles.allDoneCard}>
            <CardContent style={styles.allDoneContent}>
              <View style={styles.allDoneIconCircle}>
                <CheckCircle2 size={28} color={colors.primary} />
              </View>
              <Text style={styles.allDoneTitle}>¡Estás al día!</Text>
              <Text style={styles.allDoneSubtitle}>
                Completaste {completedDayAssignments.length} tarea{completedDayAssignments.length !== 1 ? "s" : ""} hoy
              </Text>
            </CardContent>
          </Card>
        ) : pendingAssignments.length > 0 ? (
          <View style={styles.cardStack}>
            {pendingAssignments.map(renderPendingCard)}
          </View>
        ) : null}

        {completedDayAssignments.length > 0 ? (
          <View style={styles.completedSection}>
            <Text style={styles.completedSectionLabel}>Completadas</Text>
            <View style={styles.completedList}>
              {completedDayAssignments.map((a) => (
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

        {/* Plan CTA in calendar view */}
        {hasAnyAssignments ? (
          <Pressable
            onPress={() => router.push("/(app)/plan")}
            style={styles.planCtaLink}
          >
            <Text style={styles.planCtaLinkText}>Generar un nuevo plan de tareas</Text>
            <ChevronRight size={14} color={colors.primary} />
          </Pressable>
        ) : null}

        <View style={styles.bottomPadding} />
      </ScrollView>
    );
  };

  // ─── List view content ─────────────────────────────────────────────────────

  // Group pending assignments by dueDate for the list view
  const pendingByDate = useMemo(() => {
    const groups: { dateKey: string; label: string; items: AssignmentSummary[] }[] = [];
    const map = new Map<string, AssignmentSummary[]>();
    for (const a of allPending) {
      const key = dayKey(a.dueDate);
      const list = map.get(key);
      if (list) { list.push(a); } else { map.set(key, [a]); }
    }
    // API returns sorted by dueDate asc, so iterate map in insertion order
    for (const [key, items] of map) {
      groups.push({ dateKey: key, label: formatDateHeader(items[0]!.dueDate), items });
    }
    return groups;
  }, [allPending]);

  const renderListContent = () => {
    if (isLoading) {
      return (
        <ScrollView bounces={false} contentContainerStyle={styles.scrollContent}>
          <SkeletonCard style={styles.skeleton} />
          <SkeletonCard lines={2} style={styles.skeleton} />
          <SkeletonCard style={styles.skeleton} />
        </ScrollView>
      );
    }

    if (isError) {
      return (
        <Card style={styles.errorCard}>
          <CardContent>
            <Text style={styles.errorText}>{getMobileErrorMessage(error)}</Text>
            <Button variant="ghost" onPress={() => void refetch()} style={{ marginTop: spacing.sm }}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (allPending.length === 0 && allCompleted.length === 0) {
      return (
        <EmptyState
          icon={<ClipboardList size={32} color={colors.primary} />}
          title="No tenés un plan generado"
          subtitle="Generá un plan semanal para distribuir las tareas del hogar."
          actionLabel="Planificá"
          onAction={() => router.push("/(app)/plan")}
        />
      );
    }

    return (
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
        {pendingByDate.map((group) => (
          <View key={group.dateKey} style={styles.listGroup}>
            <Text style={styles.listGroupHeader}>{group.label}</Text>
            <View style={styles.listGroupRows}>
              {group.items.map((a) => {
                const completing = completeMutation.isPending && completeMutation.variables === a.id;
                const mutating = completing || (uncompleteMutation.isPending && uncompleteMutation.variables === a.id);
                return (
                  <ListRow
                    key={a.id}
                    assignment={a}
                    onComplete={() => completeMutation.mutate(a.id, {
                      onSuccess: () => {
                        completionCountRef.current += 1;
                        if (completionCountRef.current % 5 === 0) celebrate("share-nudge");
                      },
                    })}
                    onTransfer={() => setTransferTarget(a)}
                    isCompleting={completing}
                    isMutating={mutating}
                  />
                );
              })}
            </View>
          </View>
        ))}

        {allCompleted.length > 0 ? (
          <View style={styles.completedSection}>
            <Text style={styles.completedSectionLabel}>
              Completadas ({allCompleted.length})
            </Text>
            <View style={styles.completedList}>
              {allCompleted.map((a) => (
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
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <CalendarDays size={24} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Planificá</Text>
          <View style={styles.headerSpacer} />
          <Pressable
            onPress={() => router.push("/(app)/rotations")}
            style={styles.rouletteCta}
          >
            <Dices size={16} color={colors.primary} />
            <Text style={styles.rouletteCtaText}>Ruleta</Text>
          </Pressable>
        </View>
        {hasAnyAssignments ? (
          <Pressable
            onPress={() => router.push("/(app)/plan")}
            style={styles.historyLink}
            hitSlop={8}
          >
            <History size={12} color={colors.mutedForeground} />
            <Text style={styles.historyLinkText}>Ver historial de planes</Text>
          </Pressable>
        ) : null}
        <Button
          onPress={() => router.push("/(app)/plan")}
          style={styles.generatePlanBtn}
        >
          Generar plan
        </Button>
      </View>

      {isFirstVisit ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <SectionGuideCard
            steps={[
              {
                icon: <Sparkles size={16} color={colors.primary} />,
                title: "Habita sugiere tareas",
                description: "Habita analiza tu hogar y propone qué hacer",
              },
              {
                icon: <Users size={16} color={colors.primary} />,
                title: "Distribución inteligente",
                description: "Las tareas se reparten según preferencias y carga",
              },
              {
                icon: <Star size={16} color={colors.primary} />,
                title: "Seguí tu progreso",
                description: "Completá tareas y mirá cómo avanza tu semana",
              },
            ]}
            onDismiss={dismissGuide}
          />
        </View>
      ) : null}

      {/* View mode toggle */}
      <TabBar
        items={VIEW_MODE_ITEMS}
        activeKey={viewMode}
        onChange={(key) => setViewMode(key as ViewMode)}
        style={styles.viewModeToggle}
      />

      {/* Weekly streak chip */}
      {weeklyCompletedCount > 0 ? (
        <View style={styles.streakChipRow}>
          <View style={styles.streakChip}>
            <CheckCircle2 size={14} color={colors.successText} />
            <Text style={styles.streakChipText}>
              {weeklyCompletedCount} completada{weeklyCompletedCount !== 1 ? "s" : ""} esta semana
            </Text>
          </View>
        </View>
      ) : null}

      {/* Content */}
      {viewMode === "calendar" ? (
        <View style={styles.calendarSection}>
          <DayCalendar
            days={calendarDays}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            assignmentCountByDay={assignmentCountByDay}
          />
          {renderCalendarContent()}
        </View>
      ) : (
        renderListContent()
      )}

      {transferTarget ? (
        <TransferSheet assignment={transferTarget} onClose={() => setTransferTarget(null)} />
      ) : null}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    headerTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    headerTitle: {
      ...typography.pageTitle,
      color: c.text,
    },
    viewModeToggle: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    streakChipRow: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    streakChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      backgroundColor: c.successBg,
      borderRadius: 20,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: `${c.successText}30`,
    },
    streakChipText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "600" as const,
      color: c.successText,
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
      color: c.destructive,
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
      textDecorationColor: `${c.successText}80`,
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
      color: c.mutedForeground,
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
      backgroundColor: c.successBg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    completedCheckBg: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: `${c.successText}26`,
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
      color: c.successText,
      textDecorationLine: "line-through",
      textDecorationColor: `${c.successText}80`,
    },
    completedFreq: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.successText,
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
      color: c.text,
    },
    sheetMuted: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      color: c.mutedForeground,
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
      borderColor: c.border,
      borderRadius: radius.md,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      backgroundColor: c.card,
    },
    memberName: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.text,
      fontWeight: "500",
    },
    // Header extras
    headerSpacer: {
      flex: 1,
    },
    historyLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xs,
    },
    historyLinkText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "500",
      color: c.mutedForeground,
    },
    planCtaLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: spacing.lg,
      alignSelf: "flex-start",
    },
    planCtaLinkText: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600",
      color: c.primary,
    },
    generatePlanBtn: {
      marginTop: spacing.sm,
    },
    planCta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.primary,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: spacing.sm,
    },
    planCtaText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "600",
      color: c.white,
    },
    rouletteCta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: `${c.primary}15`,
      borderRadius: radius.full,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    rouletteCtaText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "600",
      color: c.primary,
    },

    calendarSection: {
      flex: 1,
    },
    flex1: {
      flex: 1,
    },

    // Day calendar
    weekCalendar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      gap: 4,
    },
    weekCalendarOuter: {
      paddingBottom: spacing.md,
    },
    weekCalendarScroll: {
      paddingHorizontal: spacing.lg,
      gap: 4,
      alignItems: "center",
    },
    dayPill: {
      flex: 1,
      height: 68,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.lg,
    },
    dayPillFixed: {
      width: DAY_PILL_WIDTH,
      height: 68,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.lg,
    },
    dayPillSelected: {
      backgroundColor: c.primary,
    },
    dayPillToday: {
      backgroundColor: `${c.primary}15`,
    },
    dayLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "500",
      color: c.mutedForeground,
      marginBottom: 2,
    },
    dayLabelSelected: {
      color: c.white,
    },
    dayNumber: {
      fontFamily: fontFamily.sans,
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
    },
    dayNumberSelected: {
      color: c.white,
    },
    dayDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      marginTop: 3,
    },
    dayDotVisible: {
      backgroundColor: c.primary,
    },
    dayDotSelected: {
      backgroundColor: c.white,
    },
    dayDotHidden: {
      backgroundColor: "transparent",
    },

    // List view
    listGroup: {
      marginBottom: spacing.lg,
    },
    listGroupHeader: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "600",
      color: c.mutedForeground,
      textTransform: "capitalize",
      marginBottom: spacing.sm,
    },
    listGroupRows: {
      borderRadius: radius.xl,
      backgroundColor: c.card,
      overflow: "hidden",
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    listCheckbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    listCheckboxInner: {
      width: 22,
      height: 22,
    },
    listRowContent: {
      flex: 1,
      gap: 2,
    },
    listRowTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 15,
      fontWeight: "500",
      color: c.text,
    },
    listRowMeta: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
    },
    listRowAction: {
      padding: 4,
      flexShrink: 0,
    },

    bottomPadding: {
      height: 20,
    },
    allDoneCard: {
      marginBottom: spacing.md,
    },
    allDoneContent: {
      alignItems: "center" as const,
      paddingVertical: spacing.lg,
      gap: spacing.sm,
    },
    allDoneIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: `${c.primary}18`,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: spacing.xs,
    },
    allDoneTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 18,
      fontWeight: "700" as const,
      color: c.text,
    },
    allDoneSubtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.mutedForeground,
      textAlign: "center" as const,
    },
  });
}
