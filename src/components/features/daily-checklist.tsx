"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Check, Loader2, Circle, ChevronRight, PartyPopper } from "lucide-react";
import { PlanFeedbackDialog } from "@/components/features/plan-feedback-dialog";

interface ChecklistAssignment {
  id: string;
  task: { name: string; estimatedMinutes: number | null };
  dueDate: Date;
}

interface DailyChecklistProps {
  assignments: ChecklistAssignment[];
  completedToday: number;
}

interface CompleteResponse {
  planFinalized?: boolean;
  finalizedPlanId?: string;
}

export function DailyChecklist({ assignments: initialAssignments, completedToday: initialCompleted }: DailyChecklistProps) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [completedToday, setCompletedToday] = useState(initialCompleted);
  const [feedbackPlanId, setFeedbackPlanId] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const totalTasks = assignments.length + completedToday;
  const doneCount = completedToday + completedIds.size;
  const allDone = assignments.length > 0 && assignments.every((a) => completedIds.has(a.id));

  const handleComplete = async (assignmentId: string) => {
    if (completingIds.has(assignmentId) || completedIds.has(assignmentId)) return;

    setCompletingIds((prev) => new Set(prev).add(assignmentId));

    try {
      const response = await fetch(`/api/assignments/${assignmentId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = (await response.json()) as CompleteResponse;
        setCompletedIds((prev) => new Set(prev).add(assignmentId));
        setCompletedToday((prev) => prev + 1);
        toast.success("Completada");

        if (data.planFinalized) {
          toast.success("Plan finalizado", "Todas las tareas del plan fueron completadas.");
          if (data.finalizedPlanId) {
            setFeedbackPlanId(data.finalizedPlanId);
          }
        }

        // Delay refresh to let animation play
        setTimeout(() => {
          setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
          router.refresh();
        }, 600);
        return;
      }

      const errorData = (await response.json()) as { error?: string };
      toast.error("Error", errorData.error ?? "No se pudo completar la tarea");
    } catch {
      toast.error("Error", "No se pudo completar la tarea");
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(assignmentId);
        return next;
      });
    }
  };

  if (initialAssignments.length === 0 && completedToday === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="py-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Tareas de hoy</h3>
            <p className="text-xs text-muted-foreground">
              {doneCount}/{totalTasks} completadas
            </p>
          </div>
          <Link
            href="/my-tasks"
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            Ver todas
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* All done celebration */}
        {(allDone || (assignments.length === 0 && completedToday > 0)) && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5 dark:bg-green-950">
            <PartyPopper className="h-4 w-4 shrink-0 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              ¡Todo listo por hoy!
            </span>
          </div>
        )}

        {/* Task list */}
        {assignments.length > 0 && (
          <div className="space-y-1">
            {assignments.map((assignment) => {
              const isCompleting = completingIds.has(assignment.id);
              const isCompleted = completedIds.has(assignment.id);

              return (
                <button
                  key={assignment.id}
                  onClick={() => handleComplete(assignment.id)}
                  disabled={isCompleting || isCompleted}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isCompleted
                      ? "bg-green-50 dark:bg-green-950"
                      : "hover:bg-muted/50 active:bg-muted"
                  }`}
                >
                  {/* Check circle */}
                  <div className="shrink-0">
                    {isCompleting ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : isCompleted ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-foreground-tertiary" />
                    )}
                  </div>

                  {/* Task info */}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${
                      isCompleted ? "text-green-700 line-through dark:text-green-300" : "text-foreground"
                    }`}>
                      {assignment.task.name}
                    </p>
                    {assignment.task.estimatedMinutes && (
                      <p className="text-xs text-muted-foreground">
                        ~{assignment.task.estimatedMinutes} min
                      </p>
                    )}
                  </div>

                </button>
              );
            })}
          </div>
        )}
      </CardContent>

      {feedbackPlanId && (
        <PlanFeedbackDialog
          planId={feedbackPlanId}
          open
          onClose={() => setFeedbackPlanId(null)}
        />
      )}
    </Card>
  );
}
