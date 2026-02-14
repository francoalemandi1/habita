"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addDays, startOfDay, format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { spacing, contrastText } from "@/lib/design-tokens";
import { getMemberColor, getInitial } from "@/lib/member-utils";
import {
  CheckCircle2,
  XCircle,
  User,
  Users,
  Baby,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Clock,
  CheckCheck,
  CalendarDays,
  History,
  X,
  Trash2,
  ListTodo,
  Timer,
  Plus,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { computeDurationDays, MAX_PLAN_DURATION_DAYS, validateDateRange, durationLabel } from "@/lib/plan-duration";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TaskCatalogPicker } from "@/components/features/task-catalog-picker";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getTaskIcon, getTaskCategoryMeta } from "@/data/onboarding-catalog";
import { AddTaskToDayDialog } from "@/components/features/add-task-to-day-dialog";

import type { MemberType, WeeklyPlanStatus, TaskFrequency } from "@prisma/client";
import type { ExcludedTask } from "@/lib/plan-duration";
import type { DateRange } from "react-day-picker";

interface PlanAssignment {
  taskName: string;
  memberId: string;
  memberName: string;
  memberType: MemberType;
  reason: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
}

interface MemberSummary {
  id: string;
  name: string;
  type: MemberType;
  currentPending: number;
}

interface TaskSummary {
  id: string;
  name: string;
  frequency: TaskFrequency;
  weight: number;
  estimatedMinutes: number | null;
}

interface StoredPlan {
  id: string;
  status: WeeklyPlanStatus;
  balanceScore: number;
  notes: string[];
  assignments: PlanAssignment[];
  durationDays: number;
  startDate: Date | null;
  excludedTasks: ExcludedTask[];
  createdAt: Date;
  appliedAt: Date | null;
  expiresAt: Date;
}

interface PlanPreviewResponse {
  plan: {
    id: string;
    assignments: PlanAssignment[];
    balanceScore: number;
    notes: string[];
    durationDays: number;
    excludedTasks: ExcludedTask[];
    startDate: string;
    endDate: string;
  };
  members: Array<MemberSummary & { assignedInPlan: number }>;
  fairnessDetails: {
    adultDistribution: Record<string, number>;
    isSymmetric: boolean;
    maxDifference: number;
  };
}

interface PlanPageClientProps {
  householdId: string;
  members: MemberSummary[];
  tasks: TaskSummary[];
  existingPlan: StoredPlan | null;
}

const FREQUENCY_LABELS: Record<TaskFrequency, string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  ONCE: "Una vez",
};

const MEMBER_TYPE_ICONS: Record<MemberType, React.ReactNode> = {
  ADULT: <User className="h-4 w-4" />,
  TEEN: <Users className="h-4 w-4" />,
  CHILD: <Baby className="h-4 w-4" />,
};

const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  ADULT: "Adulto",
  TEEN: "Adolescente",
  CHILD: "Niño",
};

const DAY_OF_WEEK_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

const DAY_OF_WEEK_SHORT: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
  7: "Dom",
};

/** Unique key for an assignment — includes dayOfWeek and startTime so daily tasks on different days/times are distinct */
function assignmentKey(a: { taskName: string; memberId: string; dayOfWeek?: number; startTime?: string }): string {
  const base = `${a.taskName}|${a.memberId}`;
  if (!a.dayOfWeek) return base;
  return a.startTime ? `${base}|${a.dayOfWeek}|${a.startTime}` : `${base}|${a.dayOfWeek}`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}


export function PlanPageClient({
  householdId,
  members,
  tasks,
  existingPlan,
}: PlanPageClientProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [plan, setPlan] = useState<StoredPlan | null>(existingPlan);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (existingPlan?.startDate) {
      return {
        from: new Date(existingPlan.startDate),
        to: new Date(existingPlan.expiresAt),
      };
    }
    const today = startOfDay(new Date());
    return { from: today, to: addDays(today, 6) };
  });
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(() => {
    if (!existingPlan || existingPlan.status !== "PENDING") return new Set();
    return new Set(
      existingPlan.assignments.map((a) => assignmentKey(a))
    );
  });
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ taskName: string; memberId: string; memberName: string; dayOfWeek?: number } | null>(null);
  const [fairnessDetails, setFairnessDetails] = useState<{
    adultDistribution: Record<string, number>;
    isSymmetric: boolean;
    maxDifference: number;
  } | null>(null);
  const [activeDayOfWeek, setActiveDayOfWeek] = useState<number>(() => {
    if (!existingPlan?.startDate) return 1;
    const todayDate = startOfDay(new Date());
    const planStart = startOfDay(new Date(existingPlan.startDate));
    const planEnd = startOfDay(new Date(existingPlan.expiresAt));
    if (todayDate >= planStart && todayDate <= planEnd) {
      const diffDays = Math.round((todayDate.getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays + 1;
    }
    return 1;
  });
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const categorizedTasks = useMemo(
    () => {
      const groups = new Map<string, { label: string; icon: string; tasks: TaskSummary[] }>();

      for (const task of tasks) {
        const meta = getTaskCategoryMeta(task.name);
        const key = meta.label;
        const existing = groups.get(key);

        if (existing) {
          existing.tasks.push(task);
        } else {
          groups.set(key, { label: meta.label, icon: meta.icon, tasks: [task] });
        }
      }

      return Array.from(groups.values());
    },
    [tasks],
  );

  const handleGeneratePlan = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Fechas requeridas", "Seleccioná las fechas de inicio y fin del plan");
      return;
    }

    const rangeValidation = validateDateRange(dateRange.from, dateRange.to);
    if (!rangeValidation.isValid) {
      toast.error("Rango inválido", rangeValidation.error ?? "Rango de fechas inválido");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/ai/preview-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
        }),
      });

      if (response.status === 503) {
        toast.error(
          "Servicio no disponible",
          "La generación de planes no está configurada"
        );
        return;
      }

      if (response.status === 400) {
        const data = await response.json() as { error?: string };
        toast.info("Sin tareas", data.error ?? "No hay tareas para asignar");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to generate plan");
      }

      const data = (await response.json()) as PlanPreviewResponse;

      const newPlan: StoredPlan = {
        id: data.plan.id,
        status: "PENDING",
        balanceScore: data.plan.balanceScore,
        notes: data.plan.notes,
        assignments: data.plan.assignments,
        durationDays: data.plan.durationDays,
        startDate: new Date(data.plan.startDate),
        excludedTasks: data.plan.excludedTasks,
        createdAt: new Date(),
        appliedAt: null,
        expiresAt: new Date(data.plan.endDate),
      };

      setPlan(newPlan);
      setFairnessDetails(data.fairnessDetails);
      setSelectedAssignments(
        new Set(data.plan.assignments.map((a) => assignmentKey(a)))
      );

      // Reset active day to today if within range, otherwise first day
      const newStart = startOfDay(new Date(data.plan.startDate));
      const newEnd = startOfDay(new Date(data.plan.endDate));
      const todayDate = startOfDay(new Date());
      if (todayDate >= newStart && todayDate <= newEnd) {
        const diffDays = Math.round((todayDate.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24));
        setActiveDayOfWeek(diffDays + 1);
      } else {
        setActiveDayOfWeek(1);
      }
    } catch (error) {
      console.error("Generate plan error:", error);
      toast.error("Error", "No se pudo generar el plan. Intenta de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  }, [toast, dateRange]);

  const handleConfirmRegenerate = useCallback(async () => {
    setIsRegenerateDialogOpen(false);
    setPlan(null);
    await handleGeneratePlan();
  }, [handleGeneratePlan]);

  const handleDiscardPlan = useCallback(async () => {
    if (!plan || plan.status !== "PENDING") return;
    setIsDiscarding(true);

    try {
      const response = await fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to discard plan");

      setPlan(null);
      setSelectedAssignments(new Set());
      setFairnessDetails(null);
      setIsDiscardDialogOpen(false);
      toast.success("Plan descartado", "Podés generar uno nuevo cuando quieras");
      router.refresh();
    } catch {
      toast.error("Error", "No se pudo descartar el plan");
    } finally {
      setIsDiscarding(false);
    }
  }, [plan, router, toast]);

  const handleApplyPlan = useCallback(async () => {
    if (!plan) return;

    setIsApplying(true);

    try {
      const assignmentsToApply = plan.assignments
        .filter((a) => selectedAssignments.has(assignmentKey(a)))
        .map((a) => ({ taskName: a.taskName, memberId: a.memberId, memberName: a.memberName, dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime }));

      const response = await fetch("/api/ai/apply-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          assignments: assignmentsToApply,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to apply plan");
      }

      const result = (await response.json()) as {
        success: boolean;
        assignmentsCreated: number;
      };

      if (result.success && result.assignmentsCreated > 0) {
        toast.success(
          "¡Plan aplicado!",
          `Se asignaron ${result.assignmentsCreated} tareas`
        );
        setPlan((prev) =>
          prev ? { ...prev, status: "APPLIED", appliedAt: new Date() } : null
        );
        router.refresh();
      } else if (result.assignmentsCreated === 0) {
        toast.info("Sin cambios", "Todas las tareas ya estaban asignadas");
      }
    } catch (error) {
      console.error("Apply plan error:", error);
      toast.error("Error", "No se pudo aplicar el plan. Intenta de nuevo.");
    } finally {
      setIsApplying(false);
    }
  }, [plan, selectedAssignments, router, toast]);

  const toggleAssignment = (taskName: string, memberId: string, dayOfWeek?: number) => {
    if (plan?.status !== "PENDING") return;

    const key = assignmentKey({ taskName, memberId, dayOfWeek });
    const newSet = new Set(selectedAssignments);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedAssignments(newSet);
  };

  const handleAddToPlan = useCallback(
    async (taskName: string, memberId: string, memberName: string, memberType: MemberType, dayOfWeek?: number) => {
      if (!plan) return;

      const newAssignment: PlanAssignment = {
        taskName,
        memberId,
        memberName,
        memberType,
        reason: "Agregada manualmente",
        dayOfWeek,
      };

      if (plan.status === "PENDING") {
        setPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            assignments: [...prev.assignments, newAssignment],
          };
        });
        setSelectedAssignments((prev) => {
          const next = new Set(prev);
          next.add(assignmentKey({ taskName, memberId, dayOfWeek }));
          return next;
        });
        toast.success("Agregada", `${taskName} asignada a ${memberName}`);
        return;
      }

      // APPLIED plan — call API
      try {
        const response = await fetch(`/api/plans/${plan.id}/assignments`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add", taskName, memberId, dayOfWeek }),
        });

        if (!response.ok) throw new Error("Failed to add assignment");

        setPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            assignments: [...prev.assignments, newAssignment],
          };
        });
        toast.success("Agregada", `${taskName} asignada a ${memberName}`);
        router.refresh();
      } catch {
        toast.error("Error", "No se pudo agregar la asignación");
      }
    },
    [plan, router, toast]
  );

  const handleAddTaskToDay = useCallback(
    async (params: { taskName: string; memberId: string; memberName: string; memberType: MemberType; dayOfWeek: number }) => {
      await handleAddToPlan(params.taskName, params.memberId, params.memberName, params.memberType, params.dayOfWeek);
      setActiveDayOfWeek(params.dayOfWeek);
    },
    [handleAddToPlan]
  );

  const handleRemoveFromPlan = useCallback(
    async (taskName: string, memberId: string, dayOfWeek?: number) => {
      if (!plan) return;

      const matchesAssignment = (a: PlanAssignment) =>
        a.taskName === taskName && a.memberId === memberId && a.dayOfWeek === dayOfWeek;

      if (plan.status === "PENDING") {
        setPlan((prev) => {
          if (!prev) return prev;
          // Remove only the first match (one assignment per call)
          const idx = prev.assignments.findIndex(matchesAssignment);
          if (idx === -1) return prev;
          const next = [...prev.assignments];
          next.splice(idx, 1);
          return { ...prev, assignments: next };
        });
        setSelectedAssignments((prev) => {
          const next = new Set(prev);
          next.delete(assignmentKey({ taskName, memberId, dayOfWeek }));
          return next;
        });
        toast.success("Quitada", `${taskName} quitada del plan`);
        return;
      }

      // APPLIED plan — call API
      try {
        const response = await fetch(`/api/plans/${plan.id}/assignments`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "remove", taskName, memberId }),
        });

        if (!response.ok) throw new Error("Failed to remove assignment");

        setPlan((prev) => {
          if (!prev) return prev;
          const idx = prev.assignments.findIndex(matchesAssignment);
          if (idx === -1) return prev;
          const next = [...prev.assignments];
          next.splice(idx, 1);
          return { ...prev, assignments: next };
        });
        toast.success("Quitada", `${taskName} quitada del plan`);
        router.refresh();
      } catch {
        toast.error("Error", "No se pudo quitar la asignación");
      }
    },
    [plan, router, toast]
  );

  // Group assignments by memberId, deduplicating identical entries
  const assignmentsByMember = new Map<string, PlanAssignment[]>();
  if (plan) {
    const seenMemberKeys = new Set<string>();
    for (const assignment of plan.assignments) {
      const key = assignmentKey(assignment);
      if (seenMemberKeys.has(key)) continue;
      seenMemberKeys.add(key);
      const existing = assignmentsByMember.get(assignment.memberId) ?? [];
      existing.push(assignment);
      assignmentsByMember.set(assignment.memberId, existing);
    }
  }

  // Group assignments by dayOfWeek for the calendar view, deduplicating identical entries
  const hasDayInfo = plan?.assignments.some((a) => a.dayOfWeek);
  const assignmentsByDay = new Map<number, PlanAssignment[]>();
  if (plan && hasDayInfo) {
    const seenKeys = new Set<string>();
    for (const assignment of plan.assignments) {
      const key = assignmentKey(assignment);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      const day = assignment.dayOfWeek ?? 1;
      const existing = assignmentsByDay.get(day) ?? [];
      existing.push(assignment);
      assignmentsByDay.set(day, existing);
    }
  }

  // Derive actual dates for each dayOfWeek in the plan
  const planDayDates = useMemo(() => {
    if (!plan?.startDate) return new Map<number, Date>();
    const start = startOfDay(new Date(plan.startDate));
    const dates = new Map<number, Date>();
    for (let dow = 1; dow <= 7; dow++) {
      dates.set(dow, addDays(start, dow - 1));
    }
    return dates;
  }, [plan?.startDate]);

  // dayOfWeek corresponding to "today" (0 if today is outside the plan range)
  const todayDayOfWeek = useMemo(() => {
    if (!plan?.startDate) return 0;
    const todayDate = startOfDay(new Date());
    const planStart = startOfDay(new Date(plan.startDate));
    const diffDays = Math.round((todayDate.getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24));
    const dow = diffDays + 1;
    return dow >= 1 && dow <= 7 ? dow : 0;
  }, [plan?.startDate]);

  // Days that have at least one assignment (for dot indicators)
  const daysWithTasks = useMemo(() => {
    const result = new Set<number>();
    for (const [day] of assignmentsByDay.entries()) {
      result.add(day);
    }
    return result;
  }, [assignmentsByDay]);

  // Calculate adult distribution from current plan
  const adultDistribution = fairnessDetails?.adultDistribution ?? {};
  if (plan && !fairnessDetails) {
    for (const assignment of plan.assignments) {
      if (assignment.memberType === "ADULT") {
        adultDistribution[assignment.memberName] =
          (adultDistribution[assignment.memberName] ?? 0) + 1;
      }
    }
  }

  const selectedCount = selectedAssignments.size;
  const totalCount = plan?.assignments.length ?? 0;

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      {/* Header */}
      <div className={spacing.pageHeader}>
        <BackButton />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary shrink-0" />
              Plan de Distribución
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isGenerating
                ? "Generando plan..."
                : plan
                  ? plan.status === "APPLIED"
                    ? "Plan aplicado"
                    : "Revisa y aprueba el plan propuesto"
                  : `${tasks.length} tareas para ${members.length} ${members.length === 1 ? "miembro" : "miembros"}`}
            </p>
            <Link
              href="/plans"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <History className="h-3.5 w-3.5" />
              Ver historial de planes
            </Link>
          </div>
          {plan?.status === "PENDING" && (
            <Button
              onClick={handleGeneratePlan}
              disabled={isGenerating}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Regenerar
            </Button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isGenerating && !plan && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <h2 className="text-lg font-semibold mb-2">Generando plan</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Analizando tareas y distribuyendo equitativamente entre los miembros...
            </p>
          </div>
        </div>
      )}

      {/* No plan - show tasks list and generate button */}
      {!plan && !isGenerating && (
        <div className="space-y-6">
          {/* Tasks that will be distributed */}
          <Card className="border-primary/15 bg-primary/3 shadow-sm">
            <CardContent className="pt-5 pb-5 sm:pt-6 sm:pb-6">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <ListTodo className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold">Tareas a distribuir</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {tasks.length} tareas serán asignadas equitativamente entre {members.length} {members.length === 1 ? "miembro" : "miembros"}
                  </p>
                </div>
              </div>
              {tasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-primary/20 bg-primary/5 py-6 text-center">
                  <ListTodo className="mx-auto h-8 w-8 text-primary/40 mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">No hay tareas activas en tu hogar.</p>
                  <TaskCatalogPicker
                    existingTaskNames={[]}
                    onTasksCreated={() => router.refresh()}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {categorizedTasks.map((group) => (
                      <div key={group.label}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-xl leading-none">{group.icon}</span>
                          <p className="text-sm font-semibold">
                            {group.label}
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              ({group.tasks.length} {group.tasks.length === 1 ? "tarea" : "tareas"})
                            </span>
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {group.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 rounded-xl border border-primary/10 bg-white px-3 py-2.5 shadow-sm sm:justify-between"
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg leading-none">
                                  {getTaskIcon(task.name)}
                                </div>
                                <span className="min-w-0 truncate text-sm font-medium">{task.name}</span>
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                                <Badge variant="outline" className="text-xs">
                                  {FREQUENCY_LABELS[task.frequency]}
                                </Badge>
                                {task.estimatedMinutes != null && (
                                  <Badge variant="secondary" className="text-xs gap-0.5">
                                    <Timer className="h-3 w-3" />
                                    {task.estimatedMinutes} min
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <TaskCatalogPicker
                      existingTaskNames={tasks.map((t) => t.name)}
                      onTasksCreated={() => router.refresh()}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Members summary */}
          <Card className="border-primary/15 bg-primary/3 shadow-sm">
            <CardContent className="pt-5 pb-5 sm:pt-6 sm:pb-6">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold">Miembros del hogar</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    El plan considerará el tipo y capacidad de cada miembro
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2.5 rounded-xl border border-primary/10 bg-white px-3 py-2.5 shadow-sm"
                  >
                    {MEMBER_TYPE_ICONS[m.type]}
                    <span className="font-medium">{m.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {MEMBER_TYPE_LABELS[m.type]}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Date range selector */}
          <Card className="border-primary/15 bg-primary/3 shadow-sm">
            <CardContent className="pt-5 pb-5 sm:pt-6 sm:pb-6">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold">Periodo del plan</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Seleccioná las fechas de inicio y fin (máx {MAX_PLAN_DURATION_DAYS} días)
                  </p>
                </div>
              </div>
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                minDate={startOfDay(new Date())}
                maxDate={addDays(startOfDay(new Date()), MAX_PLAN_DURATION_DAYS - 1)}
              />
              {dateRange?.from && dateRange?.to && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Duración: {computeDurationDays(dateRange.from, dateRange.to)} días
                </p>
              )}
            </CardContent>
          </Card>

          {/* Generate button */}
          <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="flex min-h-[100px] items-center py-6">
              <div className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-medium">¿Listo para distribuir?</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {dateRange?.from && dateRange?.to
                      ? `${format(dateRange.from, "d MMM", { locale: es })} – ${format(dateRange.to, "d MMM yyyy", { locale: es })} (${computeDurationDays(dateRange.from, dateRange.to)} días)`
                      : "Seleccioná las fechas del plan"}
                  </p>
                </div>
                <Button
                  onClick={handleGeneratePlan}
                  disabled={isGenerating || tasks.length === 0 || !dateRange?.from || !dateRange?.to}
                  className="gap-2 sm:shrink-0"
                  size="lg"
                >
                  <CalendarDays className="h-5 w-5" />
                  Generar plan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plan exists */}
      {plan && (
        <div className="space-y-6">
          {/* Status banner */}
          {plan.status === "APPLIED" && !isGenerating && (
            <div className="rounded-2xl bg-green-50 p-3 sm:p-4 shadow-sm dark:bg-green-950">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <CheckCheck className="h-5 w-5 text-green-600 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Plan aplicado
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 truncate">
                    {plan.startDate
                      ? `${format(new Date(plan.startDate), "d MMM", { locale: es })} – ${format(new Date(plan.expiresAt), "d MMM yyyy", { locale: es })}`
                      : plan.appliedAt
                        ? `Aplicado el ${new Date(plan.appliedAt).toLocaleDateString("es", { day: "numeric", month: "long" })}`
                        : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Balance Score */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="min-w-0 text-base font-semibold sm:text-lg">Equidad de distribución</h3>
              <span className={cn("shrink-0 text-2xl font-bold sm:text-3xl", getScoreColor(plan.balanceScore))}>
                {plan.balanceScore}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Qué tan justa es la distribución entre los miembros
            </p>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full transition-all", getScoreBgColor(plan.balanceScore))}
                style={{ width: `${plan.balanceScore}%` }}
              />
            </div>
            {fairnessDetails && !fairnessDetails.isSymmetric && (
              <div className="flex items-center gap-2 text-sm text-amber-600 mt-3">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  Diferencia de {fairnessDetails.maxDifference} tareas entre adultos
                </span>
              </div>
            )}
          </div>

          {/* Date range notice */}
          {plan.status === "PENDING" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-2xl px-4 py-3">
              <Clock className="h-4 w-4" />
              <span>
                {plan.startDate
                  ? `${format(new Date(plan.startDate), "d MMM", { locale: es })} – ${format(new Date(plan.expiresAt), "d MMM yyyy", { locale: es })}`
                  : `Expira el ${new Date(plan.expiresAt).toLocaleDateString("es", { day: "numeric", month: "long" })}`}
              </span>
            </div>
          )}

          {/* Excluded tasks */}
          {plan.excludedTasks.length > 0 && (
            <div className="rounded-2xl bg-amber-50 p-4 sm:p-5 shadow-sm dark:bg-amber-950">
              <div className="mb-3">
                <h3 className="text-base font-semibold text-amber-800 dark:text-amber-200">
                  Tareas fuera de este plan
                </h3>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Estas tareas se asignarán en un plan de mayor duración
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {plan.excludedTasks.map((task) => (
                  <Badge key={task.taskName} variant="outline" className="text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-700">
                    {task.taskName} ({FREQUENCY_LABELS[task.frequency]})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Assignments — grouped by day when available, by member as fallback */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {hasDayInfo ? "Distribución semanal" : "Asignaciones propuestas"}
            </h2>

            {hasDayInfo ? (
              /* Day-based view: one day at a time with progress + day selector */
              <div className="space-y-4">
                {/* Weekly progress bar */}
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Progreso del plan
                    </span>
                    <span className="text-sm font-semibold">
                      {plan.status === "APPLIED" ? totalCount : selectedCount}/{totalCount}
                    </span>
                  </div>
                  <Progress
                    value={plan.status === "APPLIED" ? 100 : totalCount > 0 ? (selectedCount / totalCount) * 100 : 0}
                    className="h-2"
                  />
                </div>

                {/* Day selector tabs */}
                <div className="flex items-center justify-center gap-1 py-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
                    const isActive = dow === activeDayOfWeek;
                    const isToday = dow === todayDayOfWeek;
                    const hasTasks = daysWithTasks.has(dow);
                    const dayDate = planDayDates.get(dow);

                    return (
                      <button
                        key={dow}
                        type="button"
                        onClick={() => setActiveDayOfWeek(dow)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isActive && "bg-primary/10",
                        )}
                      >
                        <span
                          className={cn(
                            "text-[10px] font-semibold uppercase tracking-wide",
                            isActive ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          {DAY_OF_WEEK_SHORT[dow]}
                        </span>
                        <span
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors",
                            isActive && isToday && "bg-primary text-white",
                            isActive && !isToday && "bg-primary/15 text-primary",
                            !isActive && isToday && "text-primary font-bold",
                            !isActive && !isToday && "text-muted-foreground",
                          )}
                        >
                          {dayDate?.getDate() ?? dow}
                        </span>
                        {!isActive && hasTasks && (
                          <div className="h-1 w-1 rounded-full bg-foreground/25" />
                        )}
                        {!isActive && !hasTasks && (
                          <div className="h-1 w-1" />
                        )}
                        {isActive && (
                          <div className="h-1 w-1" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active day's tasks */}
                {(() => {
                  const dayAssignments = [...(assignmentsByDay.get(activeDayOfWeek) ?? [])].sort((a, b) =>
                    (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99")
                  );
                  const isPending = plan.status === "PENDING";

                  if (dayAssignments.length === 0) {
                    return (
                      <div className="rounded-2xl bg-white p-6 shadow-sm text-center space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Sin tareas para {DAY_OF_WEEK_LABELS[activeDayOfWeek]}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => setIsAddTaskDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4" />
                          Agregar tarea
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between bg-primary/5 px-3 py-2.5 sm:px-5 sm:py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                            {DAY_OF_WEEK_SHORT[activeDayOfWeek]}
                          </span>
                          <span className="text-sm font-semibold sm:text-base">
                            {DAY_OF_WEEK_LABELS[activeDayOfWeek]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {dayAssignments.length} {dayAssignments.length === 1 ? "tarea" : "tareas"}
                          </Badge>
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            onClick={() => setIsAddTaskDialogOpen(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <ul>
                        {dayAssignments.map((assignment, idx) => {
                          const key = assignmentKey(assignment);
                          const isSelected = selectedAssignments.has(key);

                          return (
                            <li
                              key={key}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3 transition-colors",
                                idx > 0 && "border-t border-muted/40",
                                isPending && "cursor-pointer hover:bg-muted/30",
                                !isSelected && isPending && "opacity-50"
                              )}
                            >
                              <div
                                className="mt-0.5 shrink-0"
                                onClick={() => toggleAssignment(assignment.taskName, assignment.memberId, assignment.dayOfWeek)}
                              >
                                {isSelected || plan.status === "APPLIED" ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div
                                className="flex-1 min-w-0"
                                onClick={() => toggleAssignment(assignment.taskName, assignment.memberId, assignment.dayOfWeek)}
                              >
                                <p className="font-medium truncate">
                                  {assignment.startTime && (
                                    <span className="text-xs text-muted-foreground mr-1.5">
                                      {assignment.startTime}–{assignment.endTime ?? ""}
                                    </span>
                                  )}
                                  {assignment.taskName}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none"
                                    style={{
                                      backgroundColor: getMemberColor(assignment.memberId, members),
                                      color: contrastText(getMemberColor(assignment.memberId, members)),
                                    }}
                                  >
                                    {getInitial(assignment.memberName)}
                                  </span>
                                  <span className="text-xs font-medium truncate" style={{ color: getMemberColor(assignment.memberId, members) }}>
                                    {assignment.memberName.split(" ")[0] ?? assignment.memberName}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  className="rounded-sm p-1 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRemoveTarget({ taskName: assignment.taskName, memberId: assignment.memberId, memberName: assignment.memberName, dayOfWeek: assignment.dayOfWeek });
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      {/* Clickable empty area to add tasks */}
                      <button
                        type="button"
                        className="flex w-full items-center justify-center gap-2 border-t border-dashed border-muted/40 px-3 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted/20 hover:text-primary"
                        onClick={() => setIsAddTaskDialogOpen(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar tarea
                      </button>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Member-based fallback view (for plans generated before dayOfWeek) */
              <div className="space-y-4">
                {Array.from(assignmentsByMember.entries()).map(([memberId, assignments]) => {
                  const memberType =
                    assignments[0]?.memberType ?? "ADULT";
                  const displayName = assignments[0]?.memberName ?? memberId;
                  const isPending = plan.status === "PENDING";
                  const memberData = members.find((m) => m.id === memberId);

                  return (
                    <div key={memberId} className="rounded-2xl bg-white shadow-sm overflow-hidden">
                      <div className="flex items-center gap-2 bg-muted/30 px-3 py-2.5 sm:px-5 sm:py-3">
                        {MEMBER_TYPE_ICONS[memberType]}
                        <span className="text-sm font-semibold sm:text-base truncate">{displayName}</span>
                        <Badge variant="outline" className="ml-auto shrink-0">
                          {MEMBER_TYPE_LABELS[memberType]}
                        </Badge>
                      </div>
                      <ul>
                        {assignments.map((assignment, idx) => {
                          const key = assignmentKey(assignment);
                          const isSelected = selectedAssignments.has(key);

                          return (
                            <li
                              key={key}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3 transition-colors",
                                idx > 0 && "border-t border-muted/40",
                                isPending && "cursor-pointer hover:bg-muted/30",
                                !isSelected && isPending && "opacity-50"
                              )}
                            >
                              <div
                                className="mt-0.5 shrink-0"
                                onClick={() => toggleAssignment(assignment.taskName, memberId)}
                              >
                                {isSelected || plan.status === "APPLIED" ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div
                                className="flex-1 min-w-0"
                                onClick={() => toggleAssignment(assignment.taskName, memberId)}
                              >
                                <p className="font-medium truncate">{assignment.taskName}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  className="rounded-sm p-1 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRemoveTarget({ taskName: assignment.taskName, memberId, memberName: displayName });
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      {memberData && (
                        <div className="border-t border-muted/40 px-3 py-2.5 sm:px-5 sm:py-3">
                          <TaskCatalogPicker
                            existingTaskNames={tasks.map((t) => t.name)}
                            onTasksCreated={() => router.refresh()}
                            planMode={{
                              member: { id: memberData.id, name: memberData.name, type: memberData.type },
                              existingAssignmentKeys: new Set(
                                plan.assignments.map((a) => assignmentKey(a))
                              ),
                              onAddToPlan: handleAddToPlan,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          {plan.notes.length > 0 && (
            <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm">
              <h3 className="text-base font-semibold sm:text-lg mb-3">Notas del plan</h3>
              <ul className="space-y-2">
                {plan.notes.map((note, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                    <span>•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          {plan.status === "PENDING" && (
            <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <p className="text-sm text-muted-foreground">
                  {selectedCount} de {totalCount} asignaciones seleccionadas
                </p>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => setIsDiscardDialogOpen(true)}
                    disabled={isApplying || isDiscarding}
                    className="gap-2 text-destructive hover:text-destructive flex-1 sm:flex-initial"
                  >
                    <Trash2 className="h-4 w-4" />
                    Descartar
                  </Button>
                  <Button
                    onClick={handleApplyPlan}
                    disabled={isApplying || selectedCount === 0}
                    className="gap-2 flex-1 sm:flex-initial"
                  >
                    {isApplying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Aplicando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Aplicar plan ({selectedCount})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Actions after applied */}
          {plan.status === "APPLIED" && (
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button variant="outline" className="gap-2" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <Button
                onClick={() => setIsRegenerateDialogOpen(true)}
                disabled={isGenerating}
                variant="outline"
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Regenerar plan
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Regenerate confirmation dialog */}
      <AlertDialog
        open={isRegenerateDialogOpen}
        onOpenChange={setIsRegenerateDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar plan de distribución</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Se cancelarán todas las asignaciones del plan actual (incluyendo completadas).
                </p>
                <p>
                  {dateRange?.from && dateRange?.to
                    ? `El nuevo plan cubrirá del ${format(dateRange.from, "d MMM", { locale: es })} al ${format(dateRange.to, "d MMM yyyy", { locale: es })}.`
                    : "Seleccioná las fechas para el nuevo plan."}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRegenerate}>
              Regenerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard confirmation dialog */}
      <AlertDialog
        open={isDiscardDialogOpen}
        onOpenChange={setIsDiscardDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar plan</AlertDialogTitle>
            <AlertDialogDescription>
              El plan generado se eliminará. No se crearán asignaciones. Podés generar uno nuevo después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDiscarding}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardPlan}
              disabled={isDiscarding}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDiscarding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Descartando...
                </>
              ) : (
                "Descartar plan"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove assignment confirmation dialog */}
      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitar tarea del plan</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Quitar <span className="font-semibold">{removeTarget?.taskName}</span> asignada a {removeTarget?.memberName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (removeTarget) {
                  handleRemoveFromPlan(removeTarget.taskName, removeTarget.memberId, removeTarget.dayOfWeek);
                  setRemoveTarget(null);
                }
              }}
            >
              Quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add task to day dialog */}
      {plan && (
        <AddTaskToDayDialog
          open={isAddTaskDialogOpen}
          onOpenChange={setIsAddTaskDialogOpen}
          defaultDayOfWeek={activeDayOfWeek}
          planDurationDays={plan.durationDays ?? 7}
          members={members.map((m) => ({ id: m.id, name: m.name, type: m.type }))}
          existingTaskNames={tasks.map((t) => t.name)}
          existingAssignmentKeys={new Set(plan.assignments.map((a) => assignmentKey(a)))}
          onAddTask={handleAddTaskToDay}
        />
      )}
    </div>
  );
}
