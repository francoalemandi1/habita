"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ClipboardList, Dices } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

import type { Task } from "@prisma/client";

interface TaskListProps {
  tasks: Task[];
}

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  ONCE: "Una vez",
};

const WEIGHT_LABELS: Record<number, string> = {
  1: "Muy fácil",
  2: "Fácil",
  3: "Media",
  4: "Difícil",
  5: "Muy difícil",
};

export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">Configurá las tareas del hogar</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Elegí tareas del catálogo o creá las tuyas. Después Habita las reparte automáticamente entre los miembros.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Usá el botón <span className="font-medium text-foreground">Agregar tareas</span> de arriba para empezar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const [isRouletteEligible, setIsRouletteEligible] = useState(
    task.isRouletteEligible,
  );
  const [isToggling, setIsToggling] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const handleToggleRoulette = async () => {
    if (isToggling) return;

    const newValue = !isRouletteEligible;
    setIsToggling(true);
    setIsRouletteEligible(newValue);

    try {
      await apiFetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: { isRouletteEligible: newValue },
      });
      toast.success(
        newValue ? "Agregada a la ruleta" : "Quitada de la ruleta",
        newValue
          ? `"${task.name}" ahora puede sortearse en la ruleta`
          : `"${task.name}" ya no aparece en la ruleta`,
      );
      router.refresh();
    } catch {
      setIsRouletteEligible(!newValue);
      toast.error("Error", "No se pudo actualizar la tarea");
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{task.name}</CardTitle>
          <button
            type="button"
            onClick={handleToggleRoulette}
            disabled={isToggling}
            className={cn(
              "shrink-0 rounded-full p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isRouletteEligible
                ? "bg-primary/10 text-primary"
                : "text-foreground-tertiary hover:text-muted-foreground",
            )}
            aria-label={
              isRouletteEligible
                ? "Quitar de la ruleta"
                : "Agregar a la ruleta"
            }
          >
            <Dices className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {task.description && (
          <p className="mb-3 text-sm text-muted-foreground">
            {task.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {FREQUENCY_LABELS[task.frequency]}
          </Badge>
          <Badge variant="outline">
            {WEIGHT_LABELS[task.weight] ?? `Peso ${task.weight}`}
          </Badge>
          {task.estimatedMinutes && (
            <Badge variant="outline">{task.estimatedMinutes} min</Badge>
          )}
          {task.minAge && (
            <Badge variant="outline">+{task.minAge} años</Badge>
          )}
          {isRouletteEligible && (
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              <Dices className="h-3 w-3" />
              Ruleta
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
