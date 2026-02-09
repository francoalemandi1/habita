"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
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
  Repeat,
  Trash2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DURATION_PRESETS, durationLabel } from "@/lib/plan-duration";
import { TaskCatalogPicker } from "@/components/features/task-catalog-picker";

import type { MemberType, WeeklyPlanStatus, TaskFrequency } from "@prisma/client";
import type { ExcludedTask } from "@/lib/plan-duration";

interface PlanAssignment {
  taskName: string;
  memberId: string;
  memberName: string;
  memberType: MemberType;
  reason: string;
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
  const [durationDays, setDurationDays] = useState(existingPlan?.durationDays ?? 7);
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(() => {
    if (!existingPlan || existingPlan.status !== "PENDING") return new Set();
    return new Set(
      existingPlan.assignments.map((a) => `${a.taskName}|${a.memberId}`)
    );
  });
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [customDurationInput, setCustomDurationInput] = useState("");
  const [fairnessDetails, setFairnessDetails] = useState<{
    adultDistribution: Record<string, number>;
    isSymmetric: boolean;
    maxDifference: number;
  } | null>(null);

  const router = useRouter();
  const toast = useToast();

  const handleGeneratePlan = useCallback(async () => {
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/ai/preview-plan?durationDays=${durationDays}`);

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

      // Create stored plan structure
      const newPlan: StoredPlan = {
        id: data.plan.id,
        status: "PENDING",
        balanceScore: data.plan.balanceScore,
        notes: data.plan.notes,
        assignments: data.plan.assignments,
        durationDays: data.plan.durationDays,
        excludedTasks: data.plan.excludedTasks,
        createdAt: new Date(),
        appliedAt: null,
        expiresAt: new Date(Date.now() + data.plan.durationDays * 24 * 60 * 60 * 1000),
      };

      setPlan(newPlan);
      setFairnessDetails(data.fairnessDetails);
      setSelectedAssignments(
        new Set(data.plan.assignments.map((a) => `${a.taskName}|${a.memberId}`))
      );
    } catch (error) {
      console.error("Generate plan error:", error);
      toast.error("Error", "No se pudo generar el plan. Intenta de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  }, [toast, durationDays]);

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
        .filter((a) => selectedAssignments.has(`${a.taskName}|${a.memberId}`))
        .map((a) => ({ taskName: a.taskName, memberId: a.memberId, memberName: a.memberName }));

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

  const toggleAssignment = (taskName: string, memberId: string) => {
    if (plan?.status !== "PENDING") return;

    const key = `${taskName}|${memberId}`;
    const newSet = new Set(selectedAssignments);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedAssignments(newSet);
  };

  const handleAddToPlan = useCallback(
    async (taskName: string, memberId: string, memberName: string, memberType: MemberType) => {
      if (!plan) return;

      const newAssignment: PlanAssignment = {
        taskName,
        memberId,
        memberName,
        memberType,
        reason: "Agregada manualmente",
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
          next.add(`${taskName}|${memberId}`);
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
          body: JSON.stringify({ action: "add", taskName, memberId }),
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

  const handleRemoveFromPlan = useCallback(
    async (taskName: string, memberId: string) => {
      if (!plan) return;

      if (plan.status === "PENDING") {
        setPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            assignments: prev.assignments.filter(
              (a) =>
                !(
                  a.taskName === taskName &&
                  a.memberId === memberId
                )
            ),
          };
        });
        setSelectedAssignments((prev) => {
          const next = new Set(prev);
          next.delete(`${taskName}|${memberId}`);
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
          return {
            ...prev,
            assignments: prev.assignments.filter(
              (a) =>
                !(
                  a.taskName === taskName &&
                  a.memberId === memberId
                )
            ),
          };
        });
        toast.success("Quitada", `${taskName} quitada del plan`);
        router.refresh();
      } catch {
        toast.error("Error", "No se pudo quitar la asignación");
      }
    },
    [plan, router, toast]
  );

  const handleReassign = useCallback(
    async (taskName: string, oldMemberId: string, newMemberId: string) => {
      if (!plan || oldMemberId === newMemberId) return;

      const newMember = members.find((m) => m.id === newMemberId);
      if (!newMember) return;

      if (plan.status === "PENDING") {
        setPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            assignments: prev.assignments.map((a) => {
              if (a.taskName === taskName && a.memberId === oldMemberId) {
                return {
                  ...a,
                  memberId: newMemberId,
                  memberName: newMember.name,
                  memberType: newMember.type,
                  reason: `Reasignada manualmente`,
                };
              }
              return a;
            }),
          };
        });
        setSelectedAssignments((prev) => {
          const next = new Set(prev);
          const oldKey = `${taskName}|${oldMemberId}`;
          const wasSelected = next.has(oldKey);
          next.delete(oldKey);
          if (wasSelected) {
            next.add(`${taskName}|${newMemberId}`);
          }
          return next;
        });
        toast.success("Reasignada", `${taskName} ahora es de ${newMember.name}`);
        return;
      }

      // APPLIED plan — call API
      try {
        const response = await fetch(`/api/plans/${plan.id}/assignments`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reassign",
            taskName,
            memberId: oldMemberId,
            newMemberId,
          }),
        });

        if (!response.ok) throw new Error("Failed to reassign");

        setPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            assignments: prev.assignments.map((a) => {
              if (a.taskName === taskName && a.memberId === oldMemberId) {
                return {
                  ...a,
                  memberId: newMemberId,
                  memberName: newMember.name,
                  memberType: newMember.type,
                  reason: `Reasignada manualmente`,
                };
              }
              return a;
            }),
          };
        });
        toast.success("Reasignada", `${taskName} ahora es de ${newMember.name}`);
        router.refresh();
      } catch {
        toast.error("Error", "No se pudo reasignar la tarea");
      }
    },
    [plan, members, router, toast]
  );

  // Group assignments by memberId
  const assignmentsByMember = new Map<string, PlanAssignment[]>();
  if (plan) {
    for (const assignment of plan.assignments) {
      const existing = assignmentsByMember.get(assignment.memberId) ?? [];
      existing.push(assignment);
      assignmentsByMember.set(assignment.memberId, existing);
    }
  }

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
    <div className="container max-w-4xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
              <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
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
              href="/plan/history"
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
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Tareas a distribuir</h3>
              <p className="text-sm text-muted-foreground">
                {tasks.length} tareas serán asignadas equitativamente entre {members.length} {members.length === 1 ? "miembro" : "miembros"}
              </p>
            </div>
            {tasks.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4 space-y-3">
                <p>No hay tareas activas en tu hogar.</p>
                <TaskCatalogPicker
                  existingTaskNames={[]}
                  onTasksCreated={() => router.refresh()}
                />
              </div>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-col gap-2 rounded-2xl bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="min-w-0 truncate text-sm font-medium">{task.name}</span>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {FREQUENCY_LABELS[task.frequency]}
                        </Badge>
                        {task.estimatedMinutes && (
                          <Badge variant="secondary" className="text-xs">
                            {task.estimatedMinutes} min
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <TaskCatalogPicker
                    existingTaskNames={tasks.map((t) => t.name)}
                    onTasksCreated={() => router.refresh()}
                  />
                </div>
              </>
            )}
          </div>

          {/* Members summary */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Miembros del hogar</h3>
              <p className="text-sm text-muted-foreground">
                El plan considerará el tipo y capacidad de cada miembro
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-2xl bg-muted/30 px-3 py-2"
                >
                  {MEMBER_TYPE_ICONS[m.type]}
                  <span className="font-medium">{m.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {MEMBER_TYPE_LABELS[m.type]}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Duration selector */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Duración del plan</h3>
              <p className="text-sm text-muted-foreground">
                Las tareas con frecuencia mayor a la duración se excluirán automáticamente
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {DURATION_PRESETS.map((preset) => (
                <Button
                  key={preset.days}
                  variant={durationDays === preset.days && !customDurationInput ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDurationDays(preset.days);
                    setCustomDurationInput("");
                  }}
                >
                  {preset.label}
                </Button>
              ))}
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  max={30}
                  placeholder="Días"
                  value={customDurationInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomDurationInput(value);
                    const parsed = parseInt(value, 10);
                    if (parsed >= 1 && parsed <= 30) {
                      setDurationDays(parsed);
                    }
                  }}
                  className="h-8 w-20 text-sm"
                />
                <span className="text-sm text-muted-foreground">días</span>
              </div>
            </div>
          </div>

          {/* Generate button */}
          <div className="rounded-2xl bg-primary/5 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-medium">¿Listo para distribuir?</p>
                <p className="text-sm text-muted-foreground">
                  Se generará un plan de {durationLabel(durationDays)} para tu hogar
                </p>
              </div>
              <Button
                onClick={handleGeneratePlan}
                disabled={isGenerating || tasks.length === 0}
                className="gap-2"
                size="lg"
              >
                <CalendarDays className="h-5 w-5" />
                Generar plan
              </Button>
            </div>
          </div>
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
                    Creado el{" "}
                    {plan.appliedAt
                      ? new Date(plan.appliedAt).toLocaleDateString("es", {
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
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

          {/* Expiration notice */}
          {plan.status === "PENDING" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-2xl px-4 py-3">
              <Clock className="h-4 w-4" />
              <span>
                Este plan expira el{" "}
                {new Date(plan.expiresAt).toLocaleDateString("es", {
                  day: "numeric",
                  month: "long",
                })}
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

          {/* Assignments by Member */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Asignaciones propuestas</h2>
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
                      const key = `${assignment.taskName}|${assignment.memberId}`;
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
                            {/* Reassign */}
                            <Select
                              value=""
                              onValueChange={(newMemberId) =>
                                handleReassign(assignment.taskName, memberId, newMemberId)
                              }
                            >
                              <SelectTrigger className="h-8 w-8 border-0 p-0 shadow-none [&>svg]:hidden">
                                <Repeat className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </SelectTrigger>
                              <SelectContent>
                                {members
                                  .filter((m) => m.id !== memberId)
                                  .map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                      {m.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            {/* Remove */}
                            <button
                              type="button"
                              className="rounded-sm p-1 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromPlan(assignment.taskName, memberId);
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
                            plan.assignments.map((a) => `${a.taskName}|${a.memberId}`)
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
                  Se cancelarán todas las asignaciones pendientes y en progreso del plan actual.
                </p>
                <p>
                  El nuevo plan se generará desde hoy y cubrirá los próximos {durationLabel(durationDays)}.
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
    </div>
  );
}
