"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TransferRequestButton } from "@/components/features/transfer-request-button";
import { useToast } from "@/components/ui/toast";
import { CheckCircle, Clock, Check } from "lucide-react";

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

export function MyAssignmentsList({
  assignments,
  members = [],
  currentMemberId = "",
  completedToday = 0,
  totalCompleted = 0,
}: MyAssignmentsListProps) {
  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-[var(--color-success)]" />
          <p className="text-lg font-medium">¡Todo al día!</p>
          <p className="text-muted-foreground">
            No tienes tareas pendientes. ¡Buen trabajo!
          </p>
          {(completedToday > 0 || totalCompleted > 0) && (
            <div className="mt-4 flex justify-center gap-6 text-sm">
              {completedToday > 0 && (
                <span className="text-muted-foreground">
                  <span className="font-semibold text-[var(--color-success)]">{completedToday}</span> hoy
                </span>
              )}
              {totalCompleted > 0 && (
                <span className="text-muted-foreground">
                  <span className="font-semibold text-[var(--color-xp)]">{totalCompleted}</span> totales
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <AssignmentCard
          key={assignment.id}
          assignment={assignment}
          members={members}
          currentMemberId={currentMemberId}
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
}: {
  assignment: AssignmentWithTask;
  members: Member[];
  currentMemberId: string;
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

  // Completion animation sequence
  useEffect(() => {
    if (!completionData) return;

    // Phase 2: collapse the card after showing success
    const collapseTimer = setTimeout(() => {
      setIsCollapsing(true);
    }, 800);

    // Phase 3: hide completely and show toast
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
      <div className={isCollapsing ? "animate-card-collapse" : ""}>
        <Card className="border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="flex items-center justify-center gap-3 py-6">
            <Check className="h-6 w-6 text-green-600" />
            <span className="font-medium text-green-700 dark:text-green-300">
              {assignment.task.name}
            </span>
            <span className="animate-fade-up font-bold text-[var(--color-xp)]">
              +{completionData.pointsEarned} pts
            </span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className={isOverdue ? "border-destructive" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{assignment.task.name}</CardTitle>
          <div className="flex gap-2">
            {members.length > 1 && (
              <TransferRequestButton
                assignmentId={assignment.id}
                taskName={assignment.task.name}
                members={members}
                currentMemberId={currentMemberId}
              />
            )}
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={isCompleting || assignment.status === "COMPLETED" || assignment.status === "VERIFIED"}
            >
              {isCompleting ? "Completando…" : "Completar"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {assignment.task.description && (
          <p className="mb-3 text-sm text-muted-foreground">
            {assignment.task.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {dueDate && (
            <Badge variant={isOverdue ? "destructive" : isToday ? "default" : "secondary"}>
              <Clock className="mr-1 h-3 w-3" />
              {isOverdue
                ? "Vencida"
                : isToday
                  ? "Hoy"
                  : dueDate.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })}
            </Badge>
          )}
          <Badge variant="outline">
            {FREQUENCY_LABELS[assignment.task.frequency]}
          </Badge>
          {assignment.task.estimatedMinutes && (
            <Badge variant="outline">{assignment.task.estimatedMinutes} min</Badge>
          )}
          <Badge variant="outline" className="font-semibold text-[var(--color-xp)]">
            +{assignment.task.weight * 10} pts
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
