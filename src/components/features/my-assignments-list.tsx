"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, useDraggable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { TransferRequestButton } from "@/components/features/transfer-request-button";
import { TransferDropZone } from "@/components/features/transfer-drop-zone";
import { useSwipeToAction } from "@/hooks/use-swipe-to-action";
import { useToast } from "@/components/ui/toast";
import { CheckCircle, ClipboardList, Clock, Check, Loader2, ArrowRight, Undo2, GripVertical, Timer, Trophy } from "lucide-react";
import { assignmentCardColors, spacing, iconSize } from "@/lib/design-tokens";
import { PlanFeedbackDialog } from "@/components/features/plan-feedback-dialog";
import { getHouseholdCopy } from "@/lib/household-mode";

import type { Assignment, Task } from "@prisma/client";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

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
  isSolo?: boolean;
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

/** Confetti colors from brand palette */
const CONFETTI_COLORS = ["#5260fe", "#d2ffa0", "#d0b6ff", "#ff9f43", "#fd7c52", "#ffe8c3"];

function spawnConfetti() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  for (let i = 0; i < 14; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${10 + Math.random() * 80}%`;
    piece.style.backgroundColor = CONFETTI_COLORS[i % CONFETTI_COLORS.length]!;
    piece.style.setProperty("--confetti-duration", `${2 + Math.random() * 2}s`);
    piece.style.setProperty("--confetti-delay", `${Math.random() * 0.5}s`);
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), 5000);
}

export function MyAssignmentsList({
  assignments,
  completedAssignments = [],
  members = [],
  currentMemberId = "",
  completedToday = 0,
  totalCompleted = 0,
  showPlanCta = false,
  isSolo = false,
}: MyAssignmentsListProps) {
  const [justCompletedIds, setJustCompletedIds] = useState<Set<string>>(new Set());
  const [uncompletedIds, setUncompletedIds] = useState<Set<string>>(new Set());
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const hasDnd = !isSolo && members.length > 1;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleCardCompleted = useCallback((assignmentId: string) => {
    setJustCompletedIds((prev) => new Set(prev).add(assignmentId));
  }, []);

  const handleCardUncompleted = useCallback((assignmentId: string) => {
    setUncompletedIds((prev) => new Set(prev).add(assignmentId));
    setJustCompletedIds((prev) => {
      const next = new Set(prev);
      next.delete(assignmentId);
      return next;
    });
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDragActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setDragActiveId(null);

      const { active, over } = event;
      if (!over) return;

      const assignmentId = String(active.id);
      const toMemberId = String(over.id);

      // Verify target is a member (not self)
      const targetMember = members.find((m) => m.id === toMemberId);
      if (!targetMember || toMemberId === currentMemberId) return;

      try {
        const response = await fetch("/api/transfers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentId, toMemberId }),
        });

        if (response.ok) {
          toast.success("Transferencia solicitada", `Enviada a ${targetMember.name}`);
          router.refresh();
          return;
        }

        const errorData = (await response.json()) as { error?: string };
        toast.error("Error", errorData.error ?? "No se pudo transferir la tarea");
      } catch {
        toast.error("Error", "No se pudo transferir la tarea");
      }
    },
    [members, currentMemberId, router, toast],
  );

  const handleDragCancel = useCallback(() => {
    setDragActiveId(null);
  }, []);

  // Server-loaded completed assignments that haven't been uncompleted locally
  const serverCompletedCards = completedAssignments.filter((a) => !uncompletedIds.has(a.id));

  const allEmpty = assignments.length === 0 && serverCompletedCards.length === 0 && justCompletedIds.size === 0;
  const isFirstTimeUser = allEmpty && totalCompleted === 0 && completedToday === 0;

  if (allEmpty) {
    return (
      <AllDoneState
        isFirstTimeUser={isFirstTimeUser}
        completedToday={completedToday}
        totalCompleted={totalCompleted}
        completedAssignments={completedAssignments}
        showPlanCta={showPlanCta}
        isSolo={isSolo}
      />
    );
  }

  // Find the dragged assignment for overlay
  const draggedAssignment = dragActiveId
    ? assignments.find((a) => a.id === dragActiveId)
    : null;

  const cardList = (
    <div className="space-y-6">
      {/* Drop zone for transfers (visible only during drag) */}
      {hasDnd && (
        <TransferDropZone
          members={members}
          currentMemberId={currentMemberId}
          activeId={dragActiveId}
        />
      )}

      {/* Assignment cards */}
      {assignments.length > 0 && (
        <div className="-space-y-3">
          {assignments.map((assignment, index) => {
            const isJustCompleted = justCompletedIds.has(assignment.id);
            return (
              <div
                key={assignment.id}
                className="animate-stagger-fade-in"
                style={{ "--stagger-index": index } as React.CSSProperties}
              >
                <SwipeableCard
                  assignment={assignment}
                  members={members}
                  currentMemberId={currentMemberId}
                  colorIndex={stableColorIndex(assignment.id)}
                  isFirst={index === 0}
                  isCompleted={isJustCompleted}
                  isDragging={dragActiveId === assignment.id}
                  hasDnd={hasDnd}
                  onCompleted={handleCardCompleted}
                  onUncompleted={handleCardUncompleted}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Server-loaded completed tasks */}
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

  if (!hasDnd) return cardList;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {cardList}
      <DragOverlay dropAnimation={null}>
        {draggedAssignment && (
          <DragOverlayCard assignment={draggedAssignment} colorIndex={stableColorIndex(draggedAssignment.id)} />
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ─── All Done Celebration ────────────────────────────────────────────

function AllDoneState({
  isFirstTimeUser,
  completedToday,
  totalCompleted,
  completedAssignments,
  showPlanCta,
  isSolo,
}: {
  isFirstTimeUser: boolean;
  completedToday: number;
  totalCompleted: number;
  completedAssignments: AssignmentWithTask[];
  showPlanCta: boolean;
  isSolo: boolean;
}) {
  const hasConfettied = useRef(false);

  useEffect(() => {
    if (!isFirstTimeUser && completedToday > 0 && !hasConfettied.current) {
      hasConfettied.current = true;
      spawnConfetti();
    }
  }, [isFirstTimeUser, completedToday]);

  const totalMinutesToday = completedAssignments.reduce(
    (sum, a) => sum + (a.task.estimatedMinutes ?? 0),
    0,
  );

  return (
    <div className={`rounded-[24px] bg-brand-cream ${spacing.cardPaddingEmpty} text-center`}>
      {isFirstTimeUser ? (
        <>
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <ClipboardList className={`${iconSize["2xl"]} text-primary`} />
          </div>
          <p className="text-lg font-semibold text-foreground">{getHouseholdCopy(isSolo).emptyAssignmentsTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {getHouseholdCopy(isSolo).emptyAssignmentsText}
          </p>
          <Link
            href="/plan"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Crear mi primer plan
            <ArrowRight className={iconSize.sm} />
          </Link>
        </>
      ) : (
        <>
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand-success-dark/20 animate-celebrate-pulse">
            <CheckCircle className={`${iconSize["2xl"]} text-brand-success-dark`} />
          </div>
          <p className="text-lg font-semibold text-foreground">¡Estás al día!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {completedToday > 0
              ? `Completaste ${completedToday} ${completedToday === 1 ? "tarea" : "tareas"} hoy`
              : "No tenés tareas pendientes. ¡Buen trabajo!"}
          </p>

          {/* Stat mini-cards */}
          {(completedToday > 0 || totalCompleted > 0) && (
            <div className="mt-5 flex justify-center gap-3">
              {totalMinutesToday > 0 && (
                <div className="flex flex-col items-center gap-1 rounded-xl bg-brand-lavender-light/50 px-4 py-3">
                  <Timer className="h-4 w-4 text-brand-purple-dark" />
                  <span className="text-lg font-bold text-brand-purple-dark">{totalMinutesToday}m</span>
                  <span className="text-[10px] text-muted-foreground">hoy</span>
                </div>
              )}
              {totalCompleted > 0 && (
                <div className="flex flex-col items-center gap-1 rounded-xl bg-brand-tan/50 px-4 py-3">
                  <Trophy className="h-4 w-4 text-brand-orange" />
                  <span className="text-lg font-bold text-brand-orange">{totalCompleted}</span>
                  <span className="text-[10px] text-muted-foreground">totales</span>
                </div>
              )}
            </div>
          )}

          {showPlanCta && (
            <Link
              href="/plan"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Generar un nuevo plan de tareas
              <ArrowRight className={iconSize.sm} />
            </Link>
          )}
        </>
      )}
    </div>
  );
}

// ─── Swipeable Card Wrapper ──────────────────────────────────────────

function SwipeableCard({
  assignment,
  members,
  currentMemberId,
  colorIndex,
  isFirst,
  isCompleted,
  isDragging,
  hasDnd,
  onCompleted,
  onUncompleted,
}: {
  assignment: AssignmentWithTask;
  members: Member[];
  currentMemberId: string;
  colorIndex: number;
  isFirst: boolean;
  isCompleted: boolean;
  isDragging: boolean;
  hasDnd: boolean;
  onCompleted: (assignmentId: string) => void;
  onUncompleted: (assignmentId: string) => void;
}) {
  const router = useRouter();
  const toast = useToast();

  const handleSwipeComplete = useCallback(async () => {
    try {
      const response = await fetch(`/api/assignments/${assignment.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        toast.success("Tarea completada");
        onCompleted(assignment.id);
        router.refresh();
        return;
      }

      toast.error("Error", "No se pudo completar la tarea");
    } catch {
      toast.error("Error", "No se pudo completar la tarea");
    }
  }, [assignment.id, onCompleted, router, toast]);

  const { handlers, offset, isActivated, isSnapping } = useSwipeToAction(handleSwipeComplete, {
    enabled: !isCompleted,
  });

  const showSwipeReveal = offset > 0 || isSnapping;

  return (
    <div className="relative overflow-hidden rounded-[24px]" {...handlers}>
      {/* Green reveal layer behind the card */}
      {showSwipeReveal && (
        <div className="absolute inset-0 flex items-center rounded-[24px] bg-green-500 pl-6">
          <Check className="h-8 w-8 text-white" strokeWidth={3} />
          <span className="ml-2 text-lg font-semibold text-white">
            {isActivated ? "¡Soltar!" : "Completar"}
          </span>
        </div>
      )}

      {/* Card that slides with the swipe */}
      <div
        style={{
          transform: offset > 0 || isSnapping ? `translateX(${offset}px)` : undefined,
          transition: offset === 0 && !isSnapping
            ? "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)"
            : isSnapping
              ? "transform 300ms ease-in"
              : undefined,
        }}
        className={isDragging ? "opacity-40" : undefined}
      >
        <AssignmentCard
          assignment={assignment}
          members={members}
          currentMemberId={currentMemberId}
          colorIndex={colorIndex}
          isFirst={isFirst}
          isCompleted={isCompleted}
          hasDnd={hasDnd}
          onCompleted={onCompleted}
          onUncompleted={onUncompleted}
        />
      </div>
    </div>
  );
}

// ─── Drag Overlay (simplified card shown while dragging) ─────────────

function DragOverlayCard({ assignment, colorIndex }: { assignment: AssignmentWithTask; colorIndex: number }) {
  const colors = assignmentCardColors[colorIndex] ?? assignmentCardColors[0]!;
  return (
    <div className={`rounded-[24px] ${colors.bg} px-5 py-4 shadow-xl opacity-90`}>
      <h3 className={`text-lg font-semibold ${colors.text}`}>
        {assignment.task.name}
      </h3>
      <p className={`mt-1 text-sm ${colors.meta}`}>
        {FREQUENCY_LABELS[assignment.task.frequency]}
      </p>
    </div>
  );
}

// ─── Assignment Card ─────────────────────────────────────────────────

interface CompleteResponse {
  planFinalized?: boolean;
  finalizedPlanId?: string;
}

function AssignmentCard({
  assignment,
  members,
  currentMemberId,
  colorIndex,
  isFirst,
  isCompleted,
  hasDnd,
  onCompleted,
  onUncompleted,
}: {
  assignment: AssignmentWithTask;
  members: Member[];
  currentMemberId: string;
  colorIndex: number;
  isFirst: boolean;
  isCompleted: boolean;
  hasDnd: boolean;
  onCompleted: (assignmentId: string) => void;
  onUncompleted: (assignmentId: string) => void;
}) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isUncompleting, setIsUncompleting] = useState(false);
  const [feedbackPlanId, setFeedbackPlanId] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const { attributes, listeners, setNodeRef } = useDraggable({
    id: assignment.id,
    disabled: isCompleted || !hasDnd,
  });

  const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
  const isToday = dueDate ? dueDate.toDateString() === new Date().toDateString() : false;
  const colors = assignmentCardColors[colorIndex] ?? assignmentCardColors[0]!;

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const response = await fetch(`/api/assignments/${assignment.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = (await response.json()) as CompleteResponse;

        toast.success("Tarea completada");

        if (data.planFinalized) {
          toast.success("Plan finalizado", "Todas las tareas del plan fueron completadas.");
          if (data.finalizedPlanId) {
            setFeedbackPlanId(data.finalizedPlanId);
          }
        }

        onCompleted(assignment.id);
        router.refresh();
        return;
      }

      const errorData = (await response.json()) as { error?: string };
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

      const errorData = (await response.json()) as { error?: string };
      toast.error("Error", errorData.error ?? "No se pudo desmarcar la tarea");
    } catch {
      toast.error("Error", "No se pudo desmarcar la tarea");
    } finally {
      setIsUncompleting(false);
    }
  };

  const dueDateLabel = isToday
    ? "Hoy"
    : dueDate
      ? dueDate.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })
      : null;

  return (
    <div
      ref={setNodeRef}
      className={`relative overflow-hidden rounded-[24px] ${isCompleted ? "bg-green-50 dark:bg-green-950/50" : colors.bg} ${spacing.cardPaddingWide} transition-colors duration-300`}
      style={{ zIndex: 10 - colorIndex }}
    >
      {/* Subtle decorative gradient */}
      <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 size-24 rounded-full bg-black/5" />

      {/* Drag handle */}
      {hasDnd && !isCompleted && (
        <button
          type="button"
          className={`absolute right-3 top-3 rounded-lg p-1 ${colors.meta} opacity-40 hover:opacity-70 transition-opacity touch-manipulation`}
          aria-label="Arrastrar para transferir"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}

      <div className="relative">
        <h3 className={`text-xl font-semibold ${isCompleted ? "text-green-800 line-through decoration-green-400/50 dark:text-green-200" : colors.text} ${hasDnd && !isCompleted ? "pr-8" : ""}`}>
          {assignment.task.name}
        </h3>

        {assignment.task.description && !isCompleted && (
          <p className={`mt-1 text-sm ${colors.meta}`}>
            {assignment.task.description}
          </p>
        )}

        {/* Metadata row */}
        <div className={`mt-3 flex items-center gap-1.5 text-sm ${isCompleted ? "text-green-700 dark:text-green-400/70" : colors.meta}`}>
          <Clock className={iconSize.sm} />
          <span>
            {dueDateLabel && !isCompleted && `${dueDateLabel} · `}
            {FREQUENCY_LABELS[assignment.task.frequency]}
            {assignment.task.estimatedMinutes ? ` · ${assignment.task.estimatedMinutes} min` : ""}
          </span>
        </div>

        {/* Action buttons */}
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
                    Completar
                  </>
                )}
              </Button>

              {/* Transfer button (fallback for dialog with reason) */}
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

      {feedbackPlanId && (
        <PlanFeedbackDialog
          planId={feedbackPlanId}
          open
          onClose={() => setFeedbackPlanId(null)}
        />
      )}
    </div>
  );
}

// ─── Completed Assignment Card ───────────────────────────────────────

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

      const errorData = (await response.json()) as { error?: string };
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
          {FREQUENCY_LABELS[assignment.task.frequency]}
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
