"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";

interface TodayAssignment {
  id: string;
  taskName: string;
  estimatedMinutes: number | null;
  status: string;
}

interface DashboardTodayTasksProps {
  assignments: TodayAssignment[];
  allClearHeadline: string;
}

const TODAY_HEADLINES = [
  "¡A darle! 💪",
  "¡Manos a la obra! 🙌",
  "¡Vamos que se puede! 🚀",
  "Tu día te espera ☀️",
  "¡Dale que va! 💥",
  "¡Arrancamos! 🔥",
];

function pickByHour(options: string[]): string {
  const hour = new Date().getHours();
  return options[hour % options.length] ?? options[0] ?? "";
}

export function DashboardTodayTasks({ assignments, allClearHeadline }: DashboardTodayTasksProps) {
  const router = useRouter();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const pending = assignments.filter(
    (a) => a.status !== "COMPLETED" && a.status !== "VERIFIED" && !completedIds.has(a.id),
  );
  const done = assignments.filter(
    (a) => a.status === "COMPLETED" || a.status === "VERIFIED" || completedIds.has(a.id),
  );

  const handleComplete = async (assignmentId: string) => {
    // Optimistic
    setCompletedIds((prev) => new Set(prev).add(assignmentId));

    try {
      await apiFetch(`/api/assignments/${assignmentId}/complete`, { method: "POST" });
      startTransition(() => router.refresh());
    } catch {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(assignmentId);
        return next;
      });
    }
  };

  const allDone = pending.length === 0 && assignments.length > 0;
  const noTasks = assignments.length === 0;

  return (
    <div className="rounded-2xl bg-primary/[0.06] dark:bg-primary/[0.10] px-5 py-4 animate-fade-in">
      {/* Headline */}
      <p className="font-handwritten text-2xl text-primary">
        {allDone || noTasks ? allClearHeadline : pickByHour(TODAY_HEADLINES)}
      </p>

      {noTasks ? (
        <div className="mt-1">
          <p className="text-sm font-medium text-foreground">
            No tenés tareas asignadas hoy
          </p>
          <Link
            href="/plan"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Generar plan semanal
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : allDone ? (
        <div className="mt-1">
          <p className="text-sm font-medium text-foreground">
            ¡Completaste todas tus tareas de hoy!
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {done.length} tarea{done.length !== 1 ? "s" : ""} completada{done.length !== 1 ? "s" : ""}
          </p>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm font-medium text-foreground">
            {pending.length === 1
              ? "Tenés 1 tarea para hoy"
              : `Tenés ${pending.length} tareas para hoy`}
          </p>

          {/* Task list */}
          <div className="mt-3 space-y-1">
            {pending.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-primary/5"
              >
                <button
                  type="button"
                  onClick={() => void handleComplete(a.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 transition-all hover:bg-primary hover:text-white"
                  aria-label={`Completar ${a.taskName}`}
                >
                  <Check className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
                </button>
                <span className="flex-1 text-sm font-medium text-foreground">
                  {a.taskName}
                </span>
                {a.estimatedMinutes ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {a.estimatedMinutes}m
                  </span>
                ) : null}
              </div>
            ))}

            {done.length > 0 && (
              <p className="px-3 pt-1 text-xs text-muted-foreground">
                {done.length} completada{done.length !== 1 ? "s" : ""} ✓
              </p>
            )}
          </div>

          {/* Link to full task view */}
          <Link
            href="/my-tasks"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            Ver todas
            <ChevronRight className="h-3 w-3" />
          </Link>
        </>
      )}
    </div>
  );
}
