"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  CalendarDays,
  CheckCheck,
  Clock,
  ArrowRight,
  Users,
  Timer,
  Flag,
  Loader2,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { durationLabel } from "@/lib/plan-duration";

import type { WeeklyPlanStatus, MemberType } from "@prisma/client";

interface PlanAssignment {
  taskName: string;
  memberName: string;
  memberType: MemberType;
  reason: string;
}

interface PendingAssignment {
  id: string;
  taskName: string;
  memberName: string;
  dueDate: Date;
}

interface PlanStatusCardProps {
  plan: {
    id: string;
    status: WeeklyPlanStatus;
    balanceScore: number;
    assignments: PlanAssignment[];
    durationDays?: number;
    createdAt: Date;
    appliedAt: Date | null;
    expiresAt: Date;
  } | null;
  aiEnabled: boolean;
  allAssignmentsDone?: boolean;
  pendingAssignments?: PendingAssignment[];
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

function formatTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const diffMs = new Date(expiresAt).getTime() - now.getTime();
  if (diffMs <= 0) return "Vencido";
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `Vence en ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Vence en ${diffDays}d`;
}

export function PlanStatusCard({
  plan,
  aiEnabled,
  allAssignmentsDone = false,
  pendingAssignments = [],
}: PlanStatusCardProps) {
  const router = useRouter();
  const toast = useToast();
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFinalizing, setIsFinalizing] = useState(false);

  function openFinalizeModal() {
    setSelectedIds(new Set(pendingAssignments.map((a) => a.id)));
    setShowFinalizeModal(true);
  }

  function toggleAssignment(assignmentId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(assignmentId)) {
        next.delete(assignmentId);
      } else {
        next.add(assignmentId);
      }
      return next;
    });
  }

  async function handleFinalize() {
    if (!plan) return;
    setIsFinalizing(true);
    try {
      const response = await fetch(`/api/plans/${plan.id}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentIds: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? "Error finalizando el plan");
      }

      const data = await response.json() as { completed: number; rewardsGenerated: boolean };
      setShowFinalizeModal(false);
      const completedLabel = `${data.completed} tarea${data.completed !== 1 ? "s" : ""} completada${data.completed !== 1 ? "s" : ""}`;
      const rewardsLabel = data.rewardsGenerated ? " · Recompensas generadas" : "";
      toast.success("Plan finalizado", `${completedLabel}${rewardsLabel}`);
      router.refresh();
    } catch (err) {
      toast.error(
        "Error",
        err instanceof Error ? err.message : "No se pudo finalizar el plan",
      );
    } finally {
      setIsFinalizing(false);
    }
  }

  if (!aiEnabled) {
    return null;
  }

  // No plan exists - show prompt to generate
  if (!plan) {
    return (
      <div className="rounded-2xl bg-primary/5 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-full bg-primary/10 p-2">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium">Genera un plan de distribución</p>
              <p className="truncate text-sm text-muted-foreground">
                Distribuye las tareas equitativamente entre los miembros
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="gap-2 shrink-0">
            <Link href="/plan">
              Generar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <HistoryLink />
      </div>
    );
  }

  // Pending plan - show banner to review
  if (plan.status === "PENDING") {
    const memberCount = new Set(plan.assignments.map((a) => a.memberName)).size;
    const taskCount = plan.assignments.length;

    return (
      <div className="rounded-2xl bg-amber-50 p-4 shadow-sm dark:bg-amber-950">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-900 p-2">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Plan pendiente de aprobación
                </p>
                <Badge variant="outline" className={cn("font-bold", getScoreColor(plan.balanceScore))}>
                  {plan.balanceScore}% equidad
                </Badge>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {taskCount} tareas para {memberCount} miembros
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="gap-2 shrink-0">
            <Link href="/plan">
              Revisar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // All assignments completed — prompt to generate a new plan
  if (plan.status === "APPLIED" && allAssignmentsDone) {
    return (
      <div className="rounded-2xl bg-[#d2ffa0] p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-full bg-[#7aa649]/20 p-2">
              <CheckCheck className="h-5 w-5 text-[#7aa649]" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-[#272727]">
                ¡Todas las tareas completadas!
              </p>
              <p className="text-sm text-[#272727]/60">
                Al generar un nuevo plan se crearán recompensas por tu rendimiento
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="gap-2 shrink-0">
            <Link href="/plan">
              Nuevo plan
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Applied plan - show summary with link to details + finalize button
  if (plan.status === "APPLIED") {
    const memberCount = new Set(plan.assignments.map((a) => a.memberName)).size;
    const taskCount = plan.assignments.length;

    return (
      <>
        <div className="rounded-2xl bg-green-50 p-4 shadow-sm dark:bg-green-950">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 rounded-full bg-green-100 dark:bg-green-900 p-2">
                <CheckCheck className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Plan aplicado
                  </p>
                  <Badge variant="outline" className={cn("font-bold", getScoreColor(plan.balanceScore))}>
                    {plan.balanceScore}% equidad
                  </Badge>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 flex flex-wrap items-center gap-1">
                  <span>
                    Plan de {durationLabel(plan.durationDays ?? 7)} · {taskCount} tareas para {memberCount} miembros
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-xs opacity-75">
                    <Timer className="h-3 w-3" />
                    {formatTimeRemaining(plan.expiresAt)}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900"
                onClick={openFinalizeModal}
              >
                <Flag className="h-3.5 w-3.5" />
                Finalizar
              </Button>
              <Button asChild size="sm" variant="ghost" className="gap-2 text-green-700 hover:text-green-800 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900">
                <Link href="/plan">
                  Ver detalles
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <Dialog open={showFinalizeModal} onOpenChange={setShowFinalizeModal}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Finalizar plan</DialogTitle>
              <DialogDescription>
                Seleccioná las tareas completadas. Las no seleccionadas serán canceladas. Se generarán recompensas basadas en tu rendimiento.
              </DialogDescription>
            </DialogHeader>

            {pendingAssignments.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay tareas pendientes en este plan.
              </p>
            ) : (
              <div className="space-y-2 py-2">
                {pendingAssignments.map((assignment) => (
                  <label
                    key={assignment.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedIds.has(assignment.id)}
                      onCheckedChange={() => toggleAssignment(assignment.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{assignment.taskName}</p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.memberName} · {new Date(assignment.dueDate).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowFinalizeModal(false)}
                disabled={isFinalizing}
              >
                Cancelar
              </Button>
              <Button onClick={handleFinalize} disabled={isFinalizing}>
                {isFinalizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  `Finalizar plan (${selectedIds.size})`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Expired or rejected - show generate new prompt
  return (
    <div className="rounded-2xl bg-muted/30 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-full bg-muted p-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium">Tu plan anterior expiró</p>
            <p className="truncate text-sm text-muted-foreground">
              Genera un nuevo plan de distribución
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="gap-2 shrink-0">
          <Link href="/plan">
            Nuevo plan
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <HistoryLink />
    </div>
  );
}

function HistoryLink() {
  return (
    <div className="mt-2 border-t border-black/5 pt-2">
      <Link
        href="/plan/history"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <History className="h-3 w-3" />
        Ver historial de planes
      </Link>
    </div>
  );
}
