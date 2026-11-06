"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotationToggle } from "@/components/features/rotation-toggle";
import { RefreshCw, Calendar, Clock } from "lucide-react";

import type { TaskFrequency } from "@prisma/client";

/** The flag-backed rotation shape returned by GET /api/rotations (taskId doubles as id). */
export interface RotationView {
  id: string;
  taskId: string;
  frequency: TaskFrequency;
  isActive: boolean;
  lastGenerated: Date | null;
  nextDueDate: Date | null;
  task: { id: string; name: string; frequency: TaskFrequency; weight: number };
}

interface RotationsListProps {
  rotations: RotationView[];
}

const FREQUENCY_LABELS: Record<TaskFrequency, string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  ONCE: "Una vez",
};

export function RotationsList({ rotations }: RotationsListProps) {
  if (rotations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <RefreshCw className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">Sin rotaciones activas</p>
          <p className="text-muted-foreground">
            Activa rotaciones en tus tareas para generar asignaciones automáticas
          </p>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();

  return (
    <div className="space-y-4">
      {rotations.map((rotation) => {
        const isUpcoming = rotation.nextDueDate && new Date(rotation.nextDueDate) > now;
        const isDueSoon =
          rotation.nextDueDate &&
          new Date(rotation.nextDueDate).getTime() - now.getTime() < 24 * 60 * 60 * 1000;

        return (
          <Card key={rotation.id} className={!rotation.isActive ? "opacity-60" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{rotation.task.name}</CardTitle>
                <RotationToggle
                  taskId={rotation.taskId}
                  taskName={rotation.task.name}
                  currentRotation={{
                    id: rotation.id,
                    frequency: rotation.frequency,
                    isActive: rotation.isActive,
                    nextDueDate: rotation.nextDueDate,
                  }}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  {FREQUENCY_LABELS[rotation.frequency]}
                </Badge>

                {rotation.nextDueDate && (
                  <Badge
                    variant={isDueSoon ? "default" : "secondary"}
                    className="flex items-center gap-1"
                  >
                    <Calendar className="h-3 w-3" />
                    {isUpcoming
                      ? new Date(rotation.nextDueDate).toLocaleDateString("es", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })
                      : "Pendiente de generar"}
                  </Badge>
                )}

                {rotation.lastGenerated && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Última:{" "}
                    {new Date(rotation.lastGenerated).toLocaleDateString("es", {
                      day: "numeric",
                      month: "short",
                    })}
                  </Badge>
                )}

                {!rotation.isActive && (
                  <Badge variant="secondary">Pausada</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
