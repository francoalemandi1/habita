"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

import type { Penalty, Assignment, Task } from "@prisma/client";

type PenaltyWithDetails = Penalty & {
  reasonDescription: string;
  assignment: {
    id: string;
    task: Pick<Task, "name">;
  } | null;
};

interface PenaltiesSectionProps {
  penalties: PenaltyWithDetails[];
  stats: {
    totalPenalties: number;
    totalPenaltyPoints: number;
  };
}

export function PenaltiesSection({ penalties, stats }: PenaltiesSectionProps) {
  if (penalties.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            Penalidades
          </CardTitle>
          <CardDescription>
            Tu historial de penalidades por tareas atrasadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <span className="text-3xl">🌟</span>
            </div>
            <p className="font-medium text-green-600 dark:text-green-400">
              ¡Sin penalidades!
            </p>
            <p className="text-sm text-muted-foreground">
              Sigue completando tus tareas a tiempo
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Penalidades
            </CardTitle>
            <CardDescription>
              Tu historial de penalidades por tareas atrasadas
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-orange-500">
              -{stats.totalPenaltyPoints}
            </p>
            <p className="text-xs text-muted-foreground">
              puntos perdidos
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {penalties.map((penalty) => (
            <div
              key={penalty.id}
              className="flex items-start gap-3 rounded-2xl border p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {penalty.reasonDescription}
                </p>
                {penalty.assignment?.task && (
                  <p className="text-sm text-muted-foreground truncate">
                    Tarea: {penalty.assignment.task.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(penalty.createdAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-lg font-bold text-orange-500">
                  -{penalty.points}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
