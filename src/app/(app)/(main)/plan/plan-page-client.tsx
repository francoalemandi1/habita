"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
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
import { DURATION_PRESETS, durationLabel } from "@/lib/plan-duration";

import type { MemberType, WeeklyPlanStatus, TaskFrequency } from "@prisma/client";
import type { ExcludedTask } from "@/lib/plan-duration";

interface PlanAssignment {
  taskName: string;
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
      existingPlan.assignments.map((a) => `${a.taskName}|${a.memberName}`)
    );
  });
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);
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
        new Set(data.plan.assignments.map((a) => `${a.taskName}|${a.memberName}`))
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

  const handleApplyPlan = useCallback(async () => {
    if (!plan) return;

    setIsApplying(true);

    try {
      const assignmentsToApply = plan.assignments
        .filter((a) => selectedAssignments.has(`${a.taskName}|${a.memberName}`))
        .map((a) => ({ taskName: a.taskName, memberName: a.memberName }));

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

  const toggleAssignment = (taskName: string, memberName: string, memberType: MemberType) => {
    if (memberType === "ADULT" || plan?.status !== "PENDING") return;

    const key = `${taskName}|${memberName}`;
    const newSet = new Set(selectedAssignments);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedAssignments(newSet);
  };

  // Group assignments by member
  const assignmentsByMember = new Map<string, PlanAssignment[]>();
  if (plan) {
    for (const assignment of plan.assignments) {
      const existing = assignmentsByMember.get(assignment.memberName) ?? [];
      existing.push(assignment);
      assignmentsByMember.set(assignment.memberName, existing);
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
        <Link
          href="/my-tasks"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mis tareas
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
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
          {plan?.status === "APPLIED" && (
            <Button
              onClick={() => setIsRegenerateDialogOpen(true)}
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
              Regenerar plan
            </Button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isGenerating && !plan && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <h2 className="text-lg font-semibold mb-2">Generando plan</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Analizando tareas y distribuyendo equitativamente entre los miembros...
            </p>
          </CardContent>
        </Card>
      )}

      {/* No plan - show tasks list and generate button */}
      {!plan && !isGenerating && (
        <div className="space-y-6">
          {/* Tasks that will be distributed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tareas a distribuir</CardTitle>
              <CardDescription>
                {tasks.length} tareas serán asignadas equitativamente entre {members.length} {members.length === 1 ? "miembro" : "miembros"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay tareas activas en tu hogar.{" "}
                  <Link href="/tasks" className="text-primary underline">
                    Agrega tareas
                  </Link>
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                    >
                      <span className="text-sm font-medium">{task.name}</span>
                      <div className="flex items-center gap-2">
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
              )}
            </CardContent>
          </Card>

          {/* Members summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Miembros del hogar</CardTitle>
              <CardDescription>
                El plan considerará el tipo y capacidad de cada miembro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2"
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

          {/* Duration selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Duración del plan</CardTitle>
              <CardDescription>
                Las tareas con frecuencia mayor a la duración se excluirán automáticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((preset) => (
                  <Button
                    key={preset.days}
                    variant={durationDays === preset.days ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDurationDays(preset.days)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Generate button */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plan exists */}
      {plan && (
        <div className="space-y-6">
          {/* Status banner */}
          {plan.status === "APPLIED" && !isGenerating && (
            <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
              <CardContent className="flex items-center gap-3 py-4">
                <CheckCheck className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Plan aplicado
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Las asignaciones fueron creadas el{" "}
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
              </CardContent>
            </Card>
          )}

          {/* Balance Score */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Equidad de distribución</CardTitle>
                <span className={cn("text-3xl font-bold", getScoreColor(plan.balanceScore))}>
                  {plan.balanceScore}%
                </span>
              </div>
              <CardDescription>
                Qué tan justa es la distribución entre los miembros
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Expiration notice */}
          {plan.status === "PENDING" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-3">
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
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-amber-800 dark:text-amber-200">
                  Tareas fuera de este plan
                </CardTitle>
                <CardDescription className="text-amber-600 dark:text-amber-400">
                  Estas tareas se asignarán en un plan de mayor duración
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {plan.excludedTasks.map((task) => (
                    <Badge key={task.taskName} variant="outline" className="text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-700">
                      {task.taskName} ({FREQUENCY_LABELS[task.frequency]})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assignments by Member */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Asignaciones propuestas</h2>
            {Array.from(assignmentsByMember.entries()).map(([memberName, assignments]) => {
              const memberType =
                assignments[0]?.memberType ?? "ADULT";
              const isOptional = memberType !== "ADULT";
              const isPending = plan.status === "PENDING";

              return (
                <Card key={memberName}>
                  <CardHeader className="pb-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      {MEMBER_TYPE_ICONS[memberType]}
                      <CardTitle className="text-base">{memberName}</CardTitle>
                      <Badge variant="outline" className="ml-auto">
                        {MEMBER_TYPE_LABELS[memberType]}
                      </Badge>
                      {isOptional && isPending && (
                        <span className="text-xs text-muted-foreground">(opcional)</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y">
                      {assignments.map((assignment) => {
                        const key = `${assignment.taskName}|${assignment.memberName}`;
                        const isSelected = selectedAssignments.has(key);
                        const canToggle = memberType !== "ADULT" && isPending;

                        return (
                          <li
                            key={key}
                            className={cn(
                              "flex items-start gap-3 p-4 transition-colors",
                              canToggle && "cursor-pointer hover:bg-muted/50",
                              !isSelected && isPending && "opacity-50"
                            )}
                            onClick={() =>
                              toggleAssignment(assignment.taskName, memberName, memberType)
                            }
                          >
                            <div className="mt-0.5">
                              {isSelected || plan.status === "APPLIED" ? (
                                <CheckCircle2
                                  className={cn(
                                    "h-5 w-5",
                                    canToggle ? "text-green-600" : "text-primary"
                                  )}
                                />
                              ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{assignment.taskName}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Notes */}
          {plan.notes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Notas del plan</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.notes.map((note, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                      <span>•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          {plan.status === "PENDING" && (
            <Card className="border-primary/20">
              <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
                <p className="text-sm text-muted-foreground">
                  {selectedCount} de {totalCount} asignaciones seleccionadas
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => router.push("/my-tasks")}
                    disabled={isApplying}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleApplyPlan}
                    disabled={isApplying || selectedCount === 0}
                    className="gap-2"
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
              </CardContent>
            </Card>
          )}

          {/* Actions after applied */}
          {plan.status === "APPLIED" && (
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/my-tasks" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Ver mis tareas
                </Link>
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
    </div>
  );
}
