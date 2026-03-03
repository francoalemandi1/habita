import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  ListTodo,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  XCircle,
} from "lucide-react-native";
import {
  useApplyWeeklyPlan,
  useDiscardWeeklyPlan,
  usePlanFeedback,
  usePreviewWeeklyPlan,
} from "@/hooks/use-weekly-plan";
import { useCreateTask, useDeleteTask, useTasks } from "@/hooks/use-task-management";
import { useMembers } from "@/hooks/use-members";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StyledTextInput } from "@/components/ui/text-input";
import { EmptyState } from "@/components/ui/empty-state";
import { colors, fontFamily, spacing, typography } from "@/theme";

import type { PlanAssignment, TaskFrequency } from "@habita/contracts";

// ─── constants ──────────────────────────────────────────────────────────────

const DAY_SHORT: Record<number, string> = {
  1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb", 7: "Dom",
};

const DAY_LONG: Record<number, string> = {
  1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves",
  5: "Viernes", 6: "Sábado", 7: "Domingo",
};

const FREQ_LABELS: Record<TaskFrequency, string> = {
  DAILY: "Diaria", WEEKLY: "Semanal", BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual", ONCE: "Una vez",
};

const MEMBER_TYPE_LABELS: Record<string, string> = {
  ADULT: "Adulto", TEEN: "Adolescente", CHILD: "Niño/a",
};

// ─── helpers ────────────────────────────────────────────────────────────────

function getDefaultRange(): { startDisplay: string; endDisplay: string } {
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() + 6);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  return { startDisplay: fmt(now), endDisplay: fmt(end) };
}

function displayToIso(display: string): string | null {
  const parts = display.split("/");
  if (parts.length !== 3) return null;
  const iso = `${parts[2]}-${parts[1]}-${parts[0]}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

function balanceColor(score: number): string {
  if (score >= 80) return colors.successText;
  if (score >= 60) return "#d97706";
  return colors.errorText;
}

function assignmentKey(a: { taskName: string; memberId: string; dayOfWeek?: number }): string {
  return `${a.taskName}|${a.memberId}${a.dayOfWeek != null ? `|${a.dayOfWeek}` : ""}`;
}

// ─── sub-components ─────────────────────────────────────────────────────────

interface FeedbackSectionProps { planId: string }

function FeedbackSection({ planId }: FeedbackSectionProps) {
  const feedbackMutation = usePlanFeedback();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <Card style={styles.successCard}>
        <CardContent>
          <Text style={styles.successText}>¡Gracias por tu feedback!</Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Text style={styles.sectionTitle}>¿Cómo fue el plan?</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Button key={star} variant="ghost" size="icon" onPress={() => setRating(star)}>
              {star <= rating ? "⭐" : "☆"}
            </Button>
          ))}
        </View>
        <StyledTextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Comentario opcional..."
          multiline
          style={styles.commentInput}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Button
          loading={feedbackMutation.isPending}
          disabled={!rating}
          onPress={async () => {
            if (!rating) { setError("Selecioná una calificación."); return; }
            setError(null);
            try {
              await feedbackMutation.mutateAsync({ planId, rating, comment: comment.trim() || undefined });
              setSent(true);
            } catch (err) { setError(getMobileErrorMessage(err)); }
          }}
        >
          Enviar feedback
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── main screen ────────────────────────────────────────────────────────────

export default function WeeklyPlanScreen() {
  const defaults = useMemo(() => getDefaultRange(), []);
  const previewPlan = usePreviewWeeklyPlan();
  const applyPlan = useApplyWeeklyPlan();
  const discardPlan = useDiscardWeeklyPlan();

  const tasksQuery = useTasks();
  const membersQuery = useMembers();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const householdTasks = tasksQuery.data?.tasks.filter((t) => t.isActive !== false) ?? [];
  const householdMembers = membersQuery.data?.members ?? [];

  const [startDisplay, setStartDisplay] = useState(defaults.startDisplay);
  const [endDisplay, setEndDisplay] = useState(defaults.endDisplay);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [appliedPlanId, setAppliedPlanId] = useState<string | null>(null);
  const [activeDayOfWeek, setActiveDayOfWeek] = useState(1);

  // Selected assignments set (for toggle behaviour, mirrors web)
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set());

  const plan = previewPlan.data?.plan;
  const fairness = previewPlan.data?.fairnessDetails;

  const hasDayInfo = useMemo(() => plan?.assignments.some((a) => a.dayOfWeek), [plan]);

  // Build day→assignments map
  const assignmentsByDay = useMemo(() => {
    const map = new Map<number, PlanAssignment[]>();
    if (!plan || !hasDayInfo) return map;
    const seen = new Set<string>();
    for (const a of plan.assignments) {
      const k = assignmentKey(a);
      if (seen.has(k)) continue;
      seen.add(k);
      const day = a.dayOfWeek ?? 1;
      const list = map.get(day) ?? [];
      list.push(a);
      map.set(day, list);
    }
    return map;
  }, [plan, hasDayInfo]);

  const daysWithTasks = useMemo(() => new Set(assignmentsByDay.keys()), [assignmentsByDay]);

  const totalCount = plan?.assignments.length ?? 0;
  const selectedCount = selectedAssignments.size;

  const toggleAssignment = useCallback(
    (a: PlanAssignment) => {
      const k = assignmentKey(a);
      setSelectedAssignments((prev) => {
        const next = new Set(prev);
        if (next.has(k)) { next.delete(k); } else { next.add(k); }
        return next;
      });
    },
    [],
  );

  const handlePreview = async () => {
    const startIso = displayToIso(startDisplay);
    const endIso = displayToIso(endDisplay);
    if (!startIso || !endIso) {
      setError("Ingresá las fechas en formato DD/MM/AAAA.");
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setAppliedPlanId(null);
    setActiveDayOfWeek(1);
    try {
      const result = await previewPlan.mutateAsync({
        startDate: `${startIso}T00:00:00.000Z`,
        endDate: `${endIso}T00:00:00.000Z`,
      });
      // Pre-select all assignments
      setSelectedAssignments(new Set(result.plan.assignments.map((a) => assignmentKey(a))));
    } catch (previewError) {
      setError(getMobileErrorMessage(previewError));
    }
  };

  const handleApply = async () => {
    if (!plan) return;
    setError(null);
    setSuccessMessage(null);
    try {
      const assignmentsToApply = plan.assignments.filter((a) => selectedAssignments.has(assignmentKey(a)));
      const result = await applyPlan.mutateAsync({ planId: plan.id, assignments: assignmentsToApply });
      setAppliedPlanId(plan.id);
      setSuccessMessage(
        `Plan aplicado: ${result.assignmentsCreated} tareas creadas` +
          (result.assignmentsCancelled ? `, ${result.assignmentsCancelled} canceladas` : ""),
      );
    } catch (applyError) {
      setError(getMobileErrorMessage(applyError));
    }
  };

  const handleDiscard = async () => {
    if (!plan) return;
    setError(null);
    try {
      await discardPlan.mutateAsync(plan.id);
      previewPlan.reset();
      setSelectedAssignments(new Set());
      setSuccessMessage("Plan descartado. Podés generar uno nuevo.");
    } catch (discardError) {
      setError(getMobileErrorMessage(discardError));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={styles.backTitle}>Plan semanal</Text>
          <View style={styles.backBtn} />
        </View>
        <Text style={styles.subtitle}>
          {plan
            ? "Revisá y aplicá el plan propuesto."
            : "Distribuí las tareas del hogar entre los miembros."}
        </Text>
      </View>

      <ScrollView
        bounces={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Error / Success banners ── */}
        {error ? (
          <Card style={styles.errorCard}>
            <CardContent><Text style={styles.errorText}>{error}</Text></CardContent>
          </Card>
        ) : null}

        {successMessage ? (
          <Card style={styles.successCard}>
            <CardContent>
              <View style={styles.bannerRow}>
                <CheckCircle2 size={16} color={colors.successText} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            </CardContent>
          </Card>
        ) : null}

        {appliedPlanId ? <FeedbackSection planId={appliedPlanId} /> : null}

        {/* ── SETUP SCREEN (no plan yet) ── */}
        {!plan && !previewPlan.isPending && !appliedPlanId ? (
          <>
            {/* Date picker — first so the user sets the range before seeing the task count */}
            <Card style={styles.setupCard}>
              <CardContent>
                <View style={styles.setupCardHeader}>
                  <View style={styles.setupIconBox}>
                    <CalendarDays size={20} color={colors.primary} />
                  </View>
                  <View style={styles.setupCardText}>
                    <Text style={styles.setupCardTitle}>Período del plan</Text>
                    <Text style={styles.setupCardSubtitle}>
                      Seleccioná las fechas de inicio y fin (máx 30 días)
                    </Text>
                  </View>
                </View>
                <View style={styles.dateRow}>
                  <View style={styles.dateFieldWrap}>
                    <Text style={styles.dateFieldLabel}>Desde</Text>
                    <StyledTextInput
                      value={startDisplay}
                      onChangeText={setStartDisplay}
                      placeholder="DD/MM/AAAA"
                      keyboardType="numeric"
                      leftIcon={<CalendarDays size={16} color={colors.primary} />}
                      containerStyle={styles.dateFieldInput}
                    />
                  </View>
                  <View style={styles.dateSep}>
                    <Text style={styles.dateSepText}>→</Text>
                  </View>
                  <View style={styles.dateFieldWrap}>
                    <Text style={styles.dateFieldLabel}>Hasta</Text>
                    <StyledTextInput
                      value={endDisplay}
                      onChangeText={setEndDisplay}
                      placeholder="DD/MM/AAAA"
                      keyboardType="numeric"
                      leftIcon={<CalendarDays size={16} color={colors.primary} />}
                      containerStyle={styles.dateFieldInput}
                    />
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Tasks summary */}
            <Card style={styles.setupCard}>
              <CardContent>
                <View style={styles.setupCardHeader}>
                  <View style={styles.setupIconBox}>
                    <ListTodo size={20} color={colors.primary} />
                  </View>
                  <View style={styles.setupCardText}>
                    <Text style={styles.setupCardTitle}>Tareas a distribuir</Text>
                    <Text style={styles.setupCardSubtitle}>
                      {householdTasks.length > 0
                        ? `${householdTasks.length} tareas activas entre ${householdMembers.length || "los"} miembro${householdMembers.length !== 1 ? "s" : ""}`
                        : "No hay tareas activas en tu hogar"}
                    </Text>
                  </View>
                  {householdTasks.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => setShowTasksModal(true)}
                      style={styles.detailBtn}
                      hitSlop={8}
                    >
                      <Text style={styles.detailBtnText}>Ver detalle</Text>
                      <ChevronRight size={14} color={colors.primary} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </CardContent>
            </Card>

            {/* Members */}
            {householdMembers.length > 0 ? (
              <Card style={styles.setupCard}>
                <CardContent>
                  <View style={styles.setupCardHeader}>
                    <View style={styles.setupIconBox}>
                      <Users size={20} color={colors.primary} />
                    </View>
                    <View style={styles.setupCardText}>
                      <Text style={styles.setupCardTitle}>Miembros del hogar</Text>
                      <Text style={styles.setupCardSubtitle}>
                        El plan respeta el tipo y capacidad de cada miembro
                      </Text>
                    </View>
                  </View>
                  <View style={styles.memberChips}>
                    {householdMembers.map((m) => (
                      <View key={m.id} style={styles.memberChip}>
                        <View style={styles.memberInitial}>
                          <Text style={styles.memberInitialText}>{m.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={styles.memberChipName}>{m.name.split(" ")[0] ?? m.name}</Text>
                      </View>
                    ))}
                  </View>
                </CardContent>
              </Card>
            ) : null}

            {/* Generate CTA */}
            <Card style={styles.ctaCard}>
              <CardContent>
                <View style={styles.ctaRow}>
                  <View style={styles.ctaText}>
                    <Text style={styles.ctaTitle}>¿Listo para distribuir?</Text>
                    <Text style={styles.ctaSubtitle}>
                      {startDisplay && endDisplay
                        ? `${startDisplay} → ${endDisplay}`
                        : "Completá las fechas arriba"}
                    </Text>
                  </View>
                  <Button
                    loading={previewPlan.isPending}
                    onPress={() => void handlePreview()}
                    style={styles.ctaButton}
                    disabled={householdTasks.length === 0}
                  >
                    Crear plan
                  </Button>
                </View>
              </CardContent>
            </Card>
          </>
        ) : null}

        {/* ── TASKS DETAIL MODAL ── */}
        <Modal
          visible={showTasksModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => { setShowTasksModal(false); setAddingTask(false); setNewTaskName(""); }}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Tareas a distribuir
                {householdTasks.length > 0 ? (
                  <Text style={styles.modalTitleCount}> ({householdTasks.length})</Text>
                ) : null}
              </Text>
              <Pressable
                onPress={() => { setShowTasksModal(false); setAddingTask(false); setNewTaskName(""); }}
                style={styles.modalCloseBtn}
                hitSlop={8}
              >
                <Text style={styles.modalCloseTxt}>Cerrar</Text>
              </Pressable>
            </View>

            {/* Add task row — always visible at the top */}
            {addingTask ? (
              <View style={styles.modalAddRow}>
                <StyledTextInput
                  value={newTaskName}
                  onChangeText={setNewTaskName}
                  placeholder="Nombre de la tarea..."
                  containerStyle={styles.modalAddInput}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={async () => {
                    const name = newTaskName.trim();
                    if (!name) return;
                    try {
                      await createTask.mutateAsync({ name, frequency: "WEEKLY", weight: 1, isRouletteEligible: true });
                      setNewTaskName("");
                      setAddingTask(false);
                    } catch {
                      // error visible via query state
                    }
                  }}
                  style={styles.modalAddConfirm}
                  disabled={!newTaskName.trim() || createTask.isPending}
                >
                  <Text style={styles.modalAddConfirmText}>
                    {createTask.isPending ? "Guardando..." : "Agregar"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setAddingTask(false); setNewTaskName(""); }}
                  style={styles.modalAddCancel}
                  hitSlop={8}
                >
                  <XCircle size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setAddingTask(true)}
                style={styles.modalAddBtn}
              >
                <Plus size={16} color={colors.primary} />
                <Text style={styles.modalAddBtnText}>Nueva tarea</Text>
              </TouchableOpacity>
            )}

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {householdTasks.map((task) => (
                <View key={task.id} style={styles.modalTaskRow}>
                  <View style={styles.modalTaskInfo}>
                    <Text style={styles.modalTaskName}>{task.name}</Text>
                    <View style={styles.modalTaskBadges}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{FREQ_LABELS[task.frequency]}</Text>
                      </View>
                      {task.estimatedMinutes != null ? (
                        <View style={[styles.badge, styles.badgeTime]}>
                          <Clock size={10} color={colors.mutedForeground} />
                          <Text style={styles.badgeText}>{task.estimatedMinutes} min</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => void deleteTask.mutateAsync(task.id)}
                    style={styles.modalDeleteBtn}
                    hitSlop={8}
                    disabled={deleteTask.isPending}
                  >
                    <Trash2 size={16} color={colors.errorText} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* ── LOADING STATE ── */}
        {previewPlan.isPending ? (
          <EmptyState
            pulsing
            icon={<CalendarDays size={40} color={colors.primary} />}
            title="Generando plan..."
            subtitle="Analizando tareas y distribuyendo equitativamente entre los miembros."
          />
        ) : null}

        {/* ── PLAN GENERATED ── */}
        {plan && !appliedPlanId ? (
          <>
            {/* Balance score */}
            <Card>
              <CardContent>
                <View style={styles.balanceHeader}>
                  <Text style={styles.sectionTitle}>Equidad de distribución</Text>
                  <Text style={[styles.balanceScore, { color: balanceColor(plan.balanceScore) }]}>
                    {plan.balanceScore}%
                  </Text>
                </View>
                <Text style={styles.balanceHint}>
                  Qué tan justa es la distribución entre los miembros
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(plan.balanceScore, 100)}%` as `${number}%`,
                        backgroundColor: balanceColor(plan.balanceScore),
                      },
                    ]}
                  />
                </View>
                {fairness && !fairness.isSymmetric ? (
                  <View style={styles.fairnessWarn}>
                    <AlertTriangle size={13} color="#d97706" />
                    <Text style={styles.fairnessWarnText}>
                      Diferencia de {fairness.maxDifference} tareas entre adultos
                    </Text>
                  </View>
                ) : null}
              </CardContent>
            </Card>

            {/* Excluded tasks */}
            {plan.excludedTasks.length > 0 ? (
              <Card style={styles.amberCard}>
                <CardContent>
                  <View style={styles.bannerRow}>
                    <AlertTriangle size={14} color="#d97706" />
                    <Text style={styles.amberTitle}>Tareas fuera de este plan</Text>
                  </View>
                  <Text style={styles.amberSubtitle}>
                    Estas tareas se asignarán en un plan de mayor duración
                  </Text>
                  <View style={styles.excludedBadges}>
                    {plan.excludedTasks.map((t) => {
                      const task = t as { taskName?: string; frequency?: string };
                      const name = task.taskName ?? String(t);
                      return (
                        <View key={name} style={styles.excludedBadge}>
                          <Text style={styles.excludedBadgeText}>{name}</Text>
                        </View>
                      );
                    })}
                  </View>
                </CardContent>
              </Card>
            ) : null}

            {/* Plan notes */}
            {plan.notes.length > 0 ? (
              <Card>
                <CardContent>
                  <Text style={styles.sectionTitle}>Notas del plan</Text>
                  {plan.notes.map((note) => (
                    <Text key={note} style={styles.noteItem}>· {note}</Text>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {/* Assignments section */}
            <View>
              <Text style={styles.assignmentsSectionTitle}>
                {hasDayInfo ? "Distribución semanal" : "Asignaciones propuestas"}
              </Text>

              {hasDayInfo ? (
                /* ── Day-based view ── */
                <>
                  {/* Progress bar */}
                  <Card style={styles.progressCard}>
                    <CardContent>
                      <View style={styles.progressHeaderRow}>
                        <Text style={styles.progressLabel}>Progreso del plan</Text>
                        <Text style={styles.progressCount}>{selectedCount}/{totalCount}</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: totalCount > 0 ? `${(selectedCount / totalCount) * 100}%` as `${number}%` : "0%",
                              backgroundColor: colors.primary,
                            },
                          ]}
                        />
                      </View>
                    </CardContent>
                  </Card>

                  {/* Day tabs */}
                  <View style={styles.dayTabs}>
                    {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
                      const isActive = dow === activeDayOfWeek;
                      const hasTasks = daysWithTasks.has(dow);
                      return (
                        <TouchableOpacity
                          key={dow}
                          onPress={() => setActiveDayOfWeek(dow)}
                          style={[styles.dayTab, isActive && styles.dayTabActive]}
                        >
                          <Text style={[styles.dayTabShort, isActive && styles.dayTabShortActive]}>
                            {DAY_SHORT[dow]}
                          </Text>
                          <View style={[styles.dayTabCircle, isActive && styles.dayTabCircleActive]}>
                            <Text style={[styles.dayTabNum, isActive && styles.dayTabNumActive]}>
                              {dow}
                            </Text>
                          </View>
                          <View style={styles.dayTabDot}>
                            {!isActive && hasTasks ? (
                              <View style={styles.dotFilled} />
                            ) : (
                              <View style={styles.dotEmpty} />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Active day assignments */}
                  {(() => {
                    const dayAssignments = assignmentsByDay.get(activeDayOfWeek) ?? [];
                    if (dayAssignments.length === 0) {
                      return (
                        <Card>
                          <CardContent>
                            <Text style={styles.emptyDayText}>
                              Sin tareas para {DAY_LONG[activeDayOfWeek]}
                            </Text>
                          </CardContent>
                        </Card>
                      );
                    }
                    return (
                      <Card style={styles.dayCard}>
                        <View style={styles.dayCardHeader}>
                          <View style={styles.dayShortBadge}>
                            <Text style={styles.dayShortBadgeText}>{DAY_SHORT[activeDayOfWeek]}</Text>
                          </View>
                          <Text style={styles.dayCardTitle}>{DAY_LONG[activeDayOfWeek]}</Text>
                          <View style={styles.taskCountBadge}>
                            <Text style={styles.taskCountText}>
                              {dayAssignments.length} {dayAssignments.length === 1 ? "tarea" : "tareas"}
                            </Text>
                          </View>
                        </View>
                        {dayAssignments.map((assignment, idx) => {
                          const k = assignmentKey(assignment);
                          const isSelected = selectedAssignments.has(k);
                          return (
                            <TouchableOpacity
                              key={k}
                              onPress={() => toggleAssignment(assignment)}
                              style={[
                                styles.assignmentRow,
                                idx > 0 && styles.assignmentBorder,
                                !isSelected && styles.assignmentDimmed,
                              ]}
                              activeOpacity={0.6}
                            >
                              {isSelected ? (
                                <CheckCircle2 size={20} color={colors.successText} />
                              ) : (
                                <XCircle size={20} color={colors.mutedForeground} />
                              )}
                              <View style={styles.assignmentInfo}>
                                <Text style={styles.assignmentTask}>{assignment.taskName}</Text>
                                <View style={styles.memberRowInline}>
                                  <View style={styles.memberDot}>
                                    <Text style={styles.memberDotText}>
                                      {assignment.memberName.charAt(0).toUpperCase()}
                                    </Text>
                                  </View>
                                  <Text style={styles.assignmentMeta}>
                                    {assignment.memberName.split(" ")[0] ?? assignment.memberName}
                                  </Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </Card>
                    );
                  })()}
                </>
              ) : (
                /* ── Member-based fallback view ── */
                <>
                  {(() => {
                    const byMember = new Map<string, PlanAssignment[]>();
                    const seen = new Set<string>();
                    for (const a of plan.assignments) {
                      const k = assignmentKey(a);
                      if (seen.has(k)) continue;
                      seen.add(k);
                      const list = byMember.get(a.memberId) ?? [];
                      list.push(a);
                      byMember.set(a.memberId, list);
                    }
                    return Array.from(byMember.entries()).map(([memberId, assignments]) => {
                      const displayName = assignments[0]?.memberName ?? memberId;
                      return (
                        <Card key={memberId} style={styles.memberCard}>
                          <View style={styles.memberCardHeader}>
                            <View style={styles.memberInitial}>
                              <Text style={styles.memberInitialText}>
                                {displayName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <Text style={styles.memberCardName}>{displayName}</Text>
                            <View style={styles.badge}>
                              <Text style={styles.badgeText}>
                                {MEMBER_TYPE_LABELS[assignments[0]?.memberType ?? "ADULT"] ?? "Adulto"}
                              </Text>
                            </View>
                          </View>
                          {assignments.map((assignment, idx) => {
                            const k = assignmentKey(assignment);
                            const isSelected = selectedAssignments.has(k);
                            return (
                              <TouchableOpacity
                                key={k}
                                onPress={() => toggleAssignment(assignment)}
                                style={[
                                  styles.assignmentRow,
                                  idx > 0 && styles.assignmentBorder,
                                  !isSelected && styles.assignmentDimmed,
                                ]}
                                activeOpacity={0.6}
                              >
                                {isSelected ? (
                                  <CheckCircle2 size={20} color={colors.successText} />
                                ) : (
                                  <XCircle size={20} color={colors.mutedForeground} />
                                )}
                                <Text style={styles.assignmentTask}>{assignment.taskName}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </Card>
                      );
                    });
                  })()}
                </>
              )}
            </View>

            {/* Action buttons */}
            <Card>
              <CardContent>
                <Text style={styles.selectionCount}>
                  {selectedCount} de {totalCount} asignaciones seleccionadas
                </Text>
                <View style={styles.applyActions}>
                  <Button
                    variant="outline"
                    loading={discardPlan.isPending}
                    onPress={() => void handleDiscard()}
                    style={styles.discardButton}
                  >
                    <RefreshCw size={14} color={colors.destructive} />
                    Descartar
                  </Button>
                  <Button
                    variant="success"
                    loading={applyPlan.isPending}
                    disabled={selectedCount === 0}
                    onPress={() => void handleApply()}
                    style={styles.applyButton}
                  >
                    Aplicar ({selectedCount})
                  </Button>
                </View>
              </CardContent>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  backRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  backTitle: { ...typography.cardTitle },
  subtitle: { fontFamily: fontFamily.sans, fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 32, gap: spacing.sm },

  // Banners
  errorCard: { backgroundColor: colors.errorBg },
  errorText: { fontFamily: fontFamily.sans, color: colors.errorText, fontSize: 13 },
  successCard: { backgroundColor: colors.successBg },
  bannerRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  successText: { fontFamily: fontFamily.sans, color: colors.successText, fontWeight: "600", fontSize: 13 },

  // Setup cards
  setupCard: { borderColor: `${colors.primary}22`, backgroundColor: `${colors.primary}08` },
  setupCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.md },
  setupIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.primary}18`, alignItems: "center", justifyContent: "center" },
  setupCardText: { flex: 1 },
  setupCardTitle: { fontFamily: fontFamily.sans, fontSize: 16, fontWeight: "600", color: colors.text },
  setupCardSubtitle: { fontFamily: fontFamily.sans, fontSize: 13, color: colors.mutedForeground, marginTop: 2 },

  // Tasks summary detail button
  detailBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: `${colors.primary}10` },
  detailBtnText: { fontFamily: fontFamily.sans, fontSize: 12, fontWeight: "600", color: colors.primary },

  // Shared badge
  badge: { backgroundColor: colors.muted, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: colors.border },
  badgeTime: { flexDirection: "row", alignItems: "center", gap: 3 },
  badgeText: { fontFamily: fontFamily.sans, fontSize: 11, color: colors.mutedForeground },

  // Member chips — compact, first name only, wrapping row
  memberChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  memberChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.card, borderRadius: 20, paddingLeft: 4, paddingRight: 10, paddingVertical: 4, borderWidth: 1, borderColor: `${colors.primary}20` },
  memberInitial: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  memberInitialText: { fontFamily: fontFamily.sans, fontSize: 11, fontWeight: "700", color: "#ffffff" },
  memberChipName: { fontFamily: fontFamily.sans, fontSize: 13, fontWeight: "500", color: colors.text },

  // Tasks detail modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontFamily: fontFamily.sans, fontSize: 17, fontWeight: "700", color: colors.text },
  modalTitleCount: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "400", color: colors.mutedForeground },
  modalCloseBtn: { paddingHorizontal: spacing.sm, paddingVertical: 6 },
  modalCloseTxt: { fontFamily: fontFamily.sans, fontSize: 15, color: colors.primary, fontWeight: "600" },
  // Add task button (idle state)
  modalAddBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: `${colors.primary}06` },
  modalAddBtnText: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "600", color: colors.primary },
  // Add task inline form
  modalAddRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: `${colors.primary}06` },
  modalAddInput: { flex: 1, marginBottom: 0 },
  modalAddConfirm: { paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary },
  modalAddConfirmText: { fontFamily: fontFamily.sans, fontSize: 13, fontWeight: "700", color: "#ffffff" },
  modalAddCancel: { padding: 4 },
  modalScroll: { flex: 1 },
  modalScrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 32, gap: 1 },
  modalTaskRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: `${colors.border}60` },
  modalTaskInfo: { flex: 1 },
  modalTaskName: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "500", color: colors.text, marginBottom: 4 },
  modalTaskBadges: { flexDirection: "row", alignItems: "center", gap: 4 },
  modalDeleteBtn: { padding: 6, marginLeft: spacing.sm },

  // Date fields — side-by-side
  dateRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.xs },
  dateFieldWrap: { flex: 1 },
  dateFieldLabel: { fontFamily: fontFamily.sans, fontSize: 11, fontWeight: "600", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  dateFieldInput: { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}30` },
  dateSep: { paddingBottom: 12 },
  dateSepText: { fontFamily: fontFamily.sans, fontSize: 16, color: colors.mutedForeground, fontWeight: "300" },

  // CTA card
  ctaCard: { borderColor: `${colors.primary}30`, backgroundColor: `${colors.primary}08` },
  ctaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  ctaText: { flex: 1 },
  ctaTitle: { fontFamily: fontFamily.sans, fontSize: 15, fontWeight: "600", color: colors.text },
  ctaSubtitle: { fontFamily: fontFamily.sans, fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  ctaButton: { flexShrink: 0 },

  // Feedback
  starRow: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.md },
  commentInput: { marginBottom: spacing.sm, minHeight: 60 },

  // Section title
  sectionTitle: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  assignmentsSectionTitle: { fontFamily: fontFamily.sans, fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm, marginTop: spacing.xs },

  // Balance
  balanceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceScore: { fontFamily: fontFamily.sans, fontSize: 28, fontWeight: "800" },
  balanceHint: { fontFamily: fontFamily.sans, fontSize: 12, color: colors.mutedForeground, marginBottom: spacing.sm },
  progressTrack: { height: 10, backgroundColor: colors.muted, borderRadius: 5, overflow: "hidden", marginBottom: spacing.xs },
  progressFill: { height: 10, borderRadius: 5 },
  fairnessWarn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm },
  fairnessWarnText: { fontFamily: fontFamily.sans, fontSize: 12, color: "#d97706", flex: 1 },

  // Amber excluded
  amberCard: { backgroundColor: "#fffbeb" },
  amberTitle: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "700", color: "#92400e" },
  amberSubtitle: { fontFamily: fontFamily.sans, fontSize: 12, color: "#d97706", marginTop: 4, marginBottom: spacing.sm },
  excludedBadges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  excludedBadge: { backgroundColor: "#fef3c7", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "#fcd34d" },
  excludedBadgeText: { fontFamily: fontFamily.sans, fontSize: 12, color: "#92400e" },

  // Notes
  noteItem: { fontFamily: fontFamily.sans, fontSize: 13, color: colors.text, marginBottom: 4, lineHeight: 20 },

  // Progress card
  progressCard: { marginBottom: 0 },
  progressHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  progressLabel: { fontFamily: fontFamily.sans, fontSize: 13, color: colors.mutedForeground },
  progressCount: { fontFamily: fontFamily.sans, fontSize: 13, fontWeight: "700", color: colors.text },

  // Day tabs
  dayTabs: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderRadius: 16, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  dayTab: { flex: 1, alignItems: "center", paddingVertical: 4, borderRadius: 12, gap: 2 },
  dayTabActive: { backgroundColor: `${colors.primary}12` },
  dayTabShort: { fontFamily: fontFamily.sans, fontSize: 9, fontWeight: "600", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 },
  dayTabShortActive: { color: colors.primary },
  dayTabCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dayTabCircleActive: { backgroundColor: `${colors.primary}20` },
  dayTabNum: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "500", color: colors.mutedForeground },
  dayTabNumActive: { color: colors.primary, fontWeight: "700" },
  dayTabDot: { height: 6, alignItems: "center", justifyContent: "center" },
  dotFilled: { width: 5, height: 5, borderRadius: 3, backgroundColor: `${colors.text}40` },
  dotEmpty: { width: 5, height: 5 },

  // Day card
  emptyDayText: { fontFamily: fontFamily.sans, fontSize: 13, color: colors.mutedForeground, textAlign: "center", paddingVertical: spacing.md },
  dayCard: { overflow: "hidden" },
  dayCardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: `${colors.primary}08`, paddingHorizontal: spacing.md, paddingVertical: 10 },
  dayShortBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: `${colors.primary}18`, alignItems: "center", justifyContent: "center" },
  dayShortBadgeText: { fontFamily: fontFamily.sans, fontSize: 10, fontWeight: "700", color: colors.primary },
  dayCardTitle: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "600", color: colors.text, flex: 1 },
  taskCountBadge: { backgroundColor: colors.muted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  taskCountText: { fontFamily: fontFamily.sans, fontSize: 11, color: colors.mutedForeground },

  // Assignment rows
  assignmentRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12 },
  assignmentBorder: { borderTopWidth: 1, borderTopColor: `${colors.border}80` },
  assignmentDimmed: { opacity: 0.45 },
  assignmentInfo: { flex: 1 },
  assignmentTask: { fontFamily: fontFamily.sans, fontWeight: "600", color: colors.text, fontSize: 13, flex: 1 },
  assignmentMeta: { fontFamily: fontFamily.sans, fontSize: 12, color: colors.mutedForeground },
  memberRowInline: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  memberDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  memberDotText: { fontFamily: fontFamily.sans, fontSize: 9, fontWeight: "700", color: "#ffffff" },

  // Member fallback card
  memberCard: { overflow: "hidden" },
  memberCardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: `${colors.muted}60`, paddingHorizontal: spacing.md, paddingVertical: 10 },
  memberCardName: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "600", color: colors.text, flex: 1 },

  // Action buttons
  selectionCount: { fontFamily: fontFamily.sans, fontSize: 13, color: colors.mutedForeground, marginBottom: spacing.sm, textAlign: "center" },
  applyActions: { flexDirection: "row", gap: spacing.sm },
  applyButton: { flex: 2 },
  discardButton: { flex: 1 },
});

