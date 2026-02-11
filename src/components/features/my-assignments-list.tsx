"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TransferRequestButton } from "@/components/features/transfer-request-button";
import { useToast } from "@/components/ui/toast";
import { CheckCircle, Clock, Star, Check, Loader2, ArrowRight, Undo2 } from "lucide-react";
import { calculatePoints } from "@/lib/points";
import { assignmentCardColors, spacing, iconSize } from "@/lib/design-tokens";

import type { Assignment, Task, TaskFrequency } from "@prisma/client";

interface AssignmentWithTask extends Assignment {
  task: Pick<Task, "id" | "name" | "description" | "weight" | "frequency" | "estimatedMinutes">;
}

interface Member {
  id: string;
  name: string;
}

interface MyAssignmentsListProps {
  assignments: AssignmentWithTask[];
  completedAssignments?: AssignmentWithTask[];
  members?: Member[];
  currentMemberId?: string;
  completedToday?: number;
  totalCompleted?: number;
  showPlanCta?: boolean;
}

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  ONCE: "Una vez",
};

/** Derive a stable color index from an assignment ID so it never changes when siblings are removed. */
function stableColorIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % assignmentCardColors.length;
}

export function MyAssignmentsList({
  assignments,
  completedAssignments = [],
  members = [],
  currentMemberId = "",
  completedToday = 0,
  totalCompleted = 0,
  showPlanCta = false,
}: MyAssignmentsListProps) {
  // IDs just completed locally — card stays in place but switches to completed look
  const [justCompletedIds, setJustCompletedIds] = useState<Set<string>>(new Set());
  // Points earned per assignment (for showing +pts inline)
  const [earnedPoints, setEarnedPoints] = useState<Record<string, number>>({});
  // IDs uncompleted locally (completed → pending)
  const [uncompletedIds, setUncompletedIds] = useState<Set<string>>(new Set());

  const handleCardCompleted = useCallback((assignmentId: string, pointsEarned: number) => {
    setJustCompletedIds((prev) => new Set(prev).add(assignmentId));
    setEarnedPoints((prev) => ({ ...prev, [assignmentId]: pointsEarned }));
  }, []);

  const handleCardUncompleted = useCallback((assignmentId: string) => {
    setUncompletedIds((prev) => new Set(prev).add(assignmentId));
    setJustCompletedIds((prev) => {
      const next = new Set(prev);
      next.delete(assignmentId);
      return next;
    });
    setEarnedPoints((prev) => {
      const next = { ...prev };
      delete next[assignmentId];
      return next;
    });
  }, []);

  // Server-loaded completed assignments that haven't been uncompleted locally
  const serverCompletedCards = completedAssignments.filter((a) => !uncompletedIds.has(a.id));

  const allEmpty = assignments.length === 0 && serverCompletedCards.length === 0 && justCompletedIds.size === 0;

  if (allEmpty) {
    return (
      <div className={`rounded-[24px] bg-brand-cream ${spacing.cardPaddingEmpty} text-center`}>
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand-success-dark/20">
          <CheckCircle className={`${iconSize["2xl"]} text-brand-success-dark`} />
        </div>
        <p className="text-lg font-semibold text-foreground">¡Estás al día!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No tienes tareas pendientes. ¡Buen trabajo!
        </p>
        {(completedToday > 0 || totalCompleted > 0) && (
          <div className="mt-4 flex justify-center gap-6 text-sm">
            {completedToday > 0 && (
              <span className="text-muted-foreground">
                <span className="font-semibold text-brand-success-dark">{completedToday}</span> hoy
              </span>
            )}
            {totalCompleted > 0 && (
              <span className="text-muted-foreground">
                <span className="font-semibold text-[var(--color-xp)]">{totalCompleted}</span> totales
              </span>
            )}
          </div>
        )}
        {showPlanCta && (
          <Link
            href="/plan"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Generar un nuevo plan de tareas
            <ArrowRight className={iconSize.sm} />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment cards — pending stay as-is, just-completed stay in place with completed look */}
      {assignments.length > 0 && (
        <div className="-space-y-3">
          {assignments.map((assignment, index) => {
            const isJustCompleted = justCompletedIds.has(assignment.id);
            return (
              <div
                key={assignment.id}
                className="animate-stagger-fade-in"
                style={{ '--stagger-index': index } as React.CSSProperties}
              >
                <AssignmentCard
                  assignment={assignment}
                  members={members}
                  currentMemberId={currentMemberId}
                  colorIndex={stableColorIndex(assignment.id)}
                  isFirst={index === 0}
                  isCompleted={isJustCompleted}
                  pointsEarned={earnedPoints[assignment.id]}
                  onCompleted={handleCardCompleted}
                  onUncompleted={handleCardUncompleted}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Server-loaded completed tasks (completed before page load) */}
      {serverCompletedCards.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Completadas hoy
          </p>
          <div className="space-y-2">
            {serverCompletedCards.map((assignment) => (
              <CompletedAssignmentCard
                key={assignment.id}
                assignment={assignment}
                onUncompleted={handleCardUncompleted}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface PointsBreakdown {
  base: number;
}

interface CompleteResponse {
  pointsEarned: number;
  pointsBreakdown?: PointsBreakdown;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  newAchievements?: Array<{ name: string }>;
  planFinalized?: boolean;
}

function AssignmentCard({
  assignment,
  members,
  currentMemberId,
  colorIndex,
  isFirst,
  isCompleted,
  pointsEarned,
  onCompleted,
  onUncompleted,
}: {
  assignment: AssignmentWithTask;
  members: Member[];
  currentMemberId: string;
  colorIndex: number;
  isFirst: boolean;
  isCompleted: boolean;
  pointsEarned?: number;
  onCompleted: (assignmentId: string, pointsEarned: number) => void;
  onUncompleted: (assignmentId: string) => void;
}) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isUncompleting, setIsUncompleting] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const isOverdue = assignment.dueDate ? new Date(assignment.dueDate) < new Date() : false;
  const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
  const isToday = dueDate ? dueDate.toDateString() === new Date().toDateString() : false;
  const colors = assignmentCardColors[colorIndex] ?? assignmentCardColors[0]!;
  const points = calculatePoints({ weight: assignment.task.weight, frequency: assignment.task.frequency as TaskFrequency });

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const response = await fetch(`/api/assignments/${assignment.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json() as CompleteResponse;

        let message = `+${data.pointsEarned} pts`;
        if (data.leveledUp) {
          message += ` · Nivel ${data.newLevel}!`;
        }
        if (data.newAchievements && data.newAchievements.length > 0) {
          const achievementNames = data.newAchievements.map(a => a.name).join(", ");
          message += ` · Logro: ${achievementNames}`;
        }
        toast.success("¡Tarea completada!", message);

        if (data.planFinalized) {
          toast.success("Plan finalizado", "Todas las tareas del plan fueron completadas.");
        }

        onCompleted(assignment.id, data.pointsEarned);
        router.refresh();
        return;
      }

      const errorData = await response.json() as { error?: string };
      toast.error("Error", errorData.error ?? "No se pudo completar la tarea");
    } catch {
      toast.error("Error", "No se pudo completar la tarea");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleUncomplete = async () => {
    setIsUncompleting(true);
    try {
      const response = await fetch(`/api/assignments/${assignment.id}/uncomplete`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Tarea desmarcada", "La tarea volvió a pendiente");
        onUncompleted(assignment.id);
        router.refresh();
        return;
      }

      const errorData = await response.json() as { error?: string };
      toast.error("Error", errorData.error ?? "No se pudo desmarcar la tarea");
    } catch {
      toast.error("Error", "No se pudo desmarcar la tarea");
    } finally {
      setIsUncompleting(false);
    }
  };

  const dueDateLabel = isOverdue
    ? "Vencida"
    : isToday
      ? "Hoy"
      : dueDate
        ? dueDate.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })
        : null;

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] ${isCompleted ? "bg-green-50 dark:bg-green-950/50" : colors.bg} ${spacing.cardPaddingWide} ${isOverdue && !isCompleted ? "ring-2 ring-destructive" : ""} transition-colors duration-300`}
      style={{ zIndex: 10 - colorIndex }}
    >
      {/* Subtle decorative gradient */}
      <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 size-24 rounded-full bg-black/5" />

      <div className="relative">
        <h3 className={`text-xl font-semibold ${isCompleted ? "text-green-800 line-through decoration-green-400/50 dark:text-green-200" : colors.text}`}>
          {assignment.task.name}
        </h3>

        {assignment.task.description && !isCompleted && (
          <p className={`mt-1 text-sm ${colors.meta}`}>
            {assignment.task.description}
          </p>
        )}

        {/* Metadata row 1: schedule */}
        <div className={`mt-3 flex items-center gap-1.5 text-sm ${isCompleted ? "text-green-700 dark:text-green-400/70" : colors.meta}`}>
          <Clock className={iconSize.sm} />
          <span>
            {dueDateLabel && !isCompleted && `${dueDateLabel} · `}
            {FREQUENCY_LABELS[assignment.task.frequency]}
            {assignment.task.estimatedMinutes ? ` · ${assignment.task.estimatedMinutes} min` : ""}
          </span>
        </div>

        {/* Metadata row 2: points */}
        <div className={`mt-1 flex items-center gap-1.5 text-sm font-medium ${isCompleted ? "text-green-700 dark:text-green-300" : colors.text}`}>
          <Star className={iconSize.sm} />
          <span>+{pointsEarned ?? points} pts</span>
        </div>

        {/* Action buttons row */}
        <div className="mt-4 flex items-center gap-2">
          {isCompleted ? (
            <Button
              onClick={handleUncomplete}
              disabled={isUncompleting}
              size="sm"
              className="rounded-full gap-1.5 bg-green-500/15 text-green-700 hover:bg-green-500/25 border-0 shadow-none dark:text-green-300"
              variant="outline"
            >
              {isUncompleting ? (
                <>
                  <Loader2 className={`${iconSize.sm} animate-spin`} />
                  Desmarcando...
                </>
              ) : (
                <>
                  <Undo2 className={iconSize.sm} />
                  Desmarcar
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleComplete}
                disabled={isCompleting}
                size="sm"
                className={`rounded-full gap-1.5 ${colors.btnBg} border-0 shadow-none`}
                variant="outline"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className={`${iconSize.sm} animate-spin`} />
                    Completando...
                  </>
                ) : (
                  <>
                    <Check className={iconSize.sm} strokeWidth={3} />
                    Marcar como completada
                  </>
                )}
              </Button>

              {/* Transfer button */}
              {members.length > 1 && (
                <TransferRequestButton
                  assignmentId={assignment.id}
                  taskName={assignment.task.name}
                  members={members}
                  currentMemberId={currentMemberId}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Compact card for completed tasks — shows task name, points earned, and uncomplete button */
function CompletedAssignmentCard({
  assignment,
  onUncompleted,
}: {
  assignment: AssignmentWithTask;
  onUncompleted: (assignmentId: string) => void;
}) {
  const [isUncompleting, setIsUncompleting] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const points = calculatePoints({ weight: assignment.task.weight, frequency: assignment.task.frequency as TaskFrequency });

  const handleUncomplete = async () => {
    setIsUncompleting(true);
    try {
      const response = await fetch(`/api/assignments/${assignment.id}/uncomplete`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Tarea desmarcada", "La tarea volvió a pendiente");
        onUncompleted(assignment.id);
        router.refresh();
        return;
      }

      const errorData = await response.json() as { error?: string };
      toast.error("Error", errorData.error ?? "No se pudo desmarcar la tarea");
    } catch {
      toast.error("Error", "No se pudo desmarcar la tarea");
    } finally {
      setIsUncompleting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-green-50 px-4 py-3 dark:bg-green-950/50">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/15">
        <Check className="h-3.5 w-3.5 text-green-600" strokeWidth={3} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-green-800 line-through decoration-green-400/50 dark:text-green-200">
          {assignment.task.name}
        </p>
        <p className="text-xs text-green-700 dark:text-green-400/70">
          +{points} pts · {FREQUENCY_LABELS[assignment.task.frequency]}
        </p>
      </div>
      <button
        type="button"
        onClick={handleUncomplete}
        disabled={isUncompleting}
        className="shrink-0 rounded-full p-1.5 text-green-700 transition-colors hover:bg-green-100 hover:text-green-700 active:scale-95 disabled:opacity-50 dark:hover:bg-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Desmarcar tarea"
      >
        {isUncompleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Undo2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
