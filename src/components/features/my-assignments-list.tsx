"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TransferRequestButton } from "@/components/features/transfer-request-button";
import { useToast } from "@/components/ui/toast";
import { CheckCircle, Clock, Star, Check, Loader2 } from "lucide-react";

import type { Assignment, Task } from "@prisma/client";

interface AssignmentWithTask extends Assignment {
  task: Pick<Task, "id" | "name" | "description" | "weight" | "frequency" | "estimatedMinutes">;
}

interface Member {
  id: string;
  name: string;
}

interface MyAssignmentsListProps {
  assignments: AssignmentWithTask[];
  members?: Member[];
  currentMemberId?: string;
  completedToday?: number;
  totalCompleted?: number;
}

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  ONCE: "Una vez",
};

const CARD_COLORS = [
  { bg: "bg-[#5260fe]", text: "text-white", meta: "text-white/70", btnBg: "bg-white/20 hover:bg-white/30 text-white" },
  { bg: "bg-[#d2ffa0]", text: "text-[#272727]", meta: "text-[#272727]/60", btnBg: "bg-[#272727]/10 hover:bg-[#272727]/20 text-[#272727]" },
  { bg: "bg-[#d0b6ff]", text: "text-[#272727]", meta: "text-[#272727]/60", btnBg: "bg-[#272727]/10 hover:bg-[#272727]/20 text-[#272727]" },
];

export function MyAssignmentsList({
  assignments,
  members = [],
  currentMemberId = "",
  completedToday = 0,
  totalCompleted = 0,
}: MyAssignmentsListProps) {
  if (assignments.length === 0) {
    return (
      <div className="rounded-[24px] bg-[#fff0d7] px-6 py-10 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[#7aa649]/20">
          <CheckCircle className="size-8 text-[#7aa649]" />
        </div>
        <p className="text-lg font-semibold text-foreground">¡Estás al día!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No tienes tareas pendientes. ¡Buen trabajo!
        </p>
        {(completedToday > 0 || totalCompleted > 0) && (
          <div className="mt-4 flex justify-center gap-6 text-sm">
            {completedToday > 0 && (
              <span className="text-muted-foreground">
                <span className="font-semibold text-[#7aa649]">{completedToday}</span> hoy
              </span>
            )}
            {totalCompleted > 0 && (
              <span className="text-muted-foreground">
                <span className="font-semibold text-[var(--color-xp)]">{totalCompleted}</span> totales
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="-space-y-3">
      {assignments.map((assignment, index) => (
        <AssignmentCard
          key={assignment.id}
          assignment={assignment}
          members={members}
          currentMemberId={currentMemberId}
          colorIndex={index % CARD_COLORS.length}
          isFirst={index === 0}
        />
      ))}
    </div>
  );
}

interface CompleteResponse {
  pointsEarned: number;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  newAchievements?: Array<{ name: string }>;
}

function AssignmentCard({
  assignment,
  members,
  currentMemberId,
  colorIndex,
  isFirst,
}: {
  assignment: AssignmentWithTask;
  members: Member[];
  currentMemberId: string;
  colorIndex: number;
  isFirst: boolean;
}) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionData, setCompletionData] = useState<CompleteResponse | null>(null);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const isOverdue = assignment.dueDate ? new Date(assignment.dueDate) < new Date() : false;
  const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
  const isToday = dueDate ? dueDate.toDateString() === new Date().toDateString() : false;
  const colors = CARD_COLORS[colorIndex] ?? CARD_COLORS[0]!;
  const points = assignment.task.weight * 10;

  // Completion animation sequence
  useEffect(() => {
    if (!completionData) return;

    const collapseTimer = setTimeout(() => {
      setIsCollapsing(true);
    }, 800);

    const hideTimer = setTimeout(() => {
      setIsHidden(true);

      let message = `¡+${completionData.pointsEarned} puntos!`;
      if (completionData.leveledUp) {
        message += ` Subiste al Nivel ${completionData.newLevel}`;
      }
      if (completionData.newAchievements && completionData.newAchievements.length > 0) {
        const achievementNames = completionData.newAchievements.map(a => a.name).join(", ");
        message += ` Logro desbloqueado: ${achievementNames}`;
      }

      toast.success("¡Tarea completada!", message);
      router.refresh();
    }, 1100);

    return () => {
      clearTimeout(collapseTimer);
      clearTimeout(hideTimer);
    };
  }, [completionData, toast, router]);

  if (isHidden) {
    return null;
  }

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
        setCompletionData(data);
        return;
      }

      const errorData = await response.json() as { error?: string };
      toast.error("Error", errorData.error ?? "No se pudo completar la tarea");
      setIsCompleting(false);
    } catch {
      toast.error("Error", "No se pudo completar la tarea");
      setIsCompleting(false);
    }
  };

  // Completion success state
  if (completionData) {
    return (
      <div className={`relative z-[${10 - colorIndex}] ${isCollapsing ? "animate-card-collapse" : ""}`}>
        <div className="rounded-[24px] bg-green-50 px-5 py-6 flex items-center justify-center gap-3 dark:bg-green-950">
          <Check className="h-6 w-6 text-green-600" />
          <span className="font-medium text-green-700 dark:text-green-300">
            {assignment.task.name}
          </span>
          <span className="animate-fade-up font-bold text-[var(--color-xp)]">
            +{completionData.pointsEarned} pts
          </span>
        </div>
      </div>
    );
  }

  const dueDateLabel = isOverdue
    ? "Vencida"
    : isToday
      ? "Hoy"
      : dueDate
        ? dueDate.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })
        : null;

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] ${colors.bg} p-5 ${isOverdue ? "ring-2 ring-destructive" : ""}`}
      style={{ zIndex: 10 - colorIndex }}
    >
      {/* Subtle decorative gradient */}
      <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 size-24 rounded-full bg-black/5" />

      <div className="relative">
        <h3 className={`text-xl font-semibold ${colors.text}`}>
          {assignment.task.name}
        </h3>

        {assignment.task.description && (
          <p className={`mt-1 text-sm ${colors.meta}`}>
            {assignment.task.description}
          </p>
        )}

        {/* Metadata row 1: schedule */}
        <div className={`mt-3 flex items-center gap-1.5 text-sm ${colors.meta}`}>
          <Clock className="size-3.5" />
          <span>
            {dueDateLabel && `${dueDateLabel} · `}
            {FREQUENCY_LABELS[assignment.task.frequency]}
            {assignment.task.estimatedMinutes ? ` · ${assignment.task.estimatedMinutes} min` : ""}
          </span>
        </div>

        {/* Metadata row 2: points */}
        <div className={`mt-1 flex items-center gap-1.5 text-sm font-medium ${colors.text}`}>
          <Star className="size-3.5" />
          <span>+{points} pts</span>
        </div>

        {/* Action buttons row */}
        <div className="mt-4 flex items-center gap-2">
          <Button
            onClick={handleComplete}
            disabled={isCompleting || assignment.status === "COMPLETED" || assignment.status === "VERIFIED"}
            size="sm"
            className={`rounded-full gap-1.5 ${colors.btnBg} border-0 shadow-none`}
            variant="outline"
          >
            {isCompleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Completando...
              </>
            ) : (
              <>
                <Check className="size-3.5" strokeWidth={3} />
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
        </div>
      </div>
    </div>
  );
}
