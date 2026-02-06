import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";

import type { TaskFrequency } from "@prisma/client";

const FREQUENCY_LABELS: Record<TaskFrequency, string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  ONCE: "Una vez",
};

interface ExcludedTask {
  taskName: string;
  frequency: TaskFrequency;
}

interface UpcomingTasksCardProps {
  excludedTasks: ExcludedTask[];
}

export function UpcomingTasksCard({ excludedTasks }: UpcomingTasksCardProps) {
  if (excludedTasks.length === 0) {
    return null;
  }

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Próximas tareas</CardTitle>
        </div>
        <CardDescription>
          Estas tareas se asignarán en tu próximo plan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {excludedTasks.map((task) => (
            <div
              key={task.taskName}
              className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2"
            >
              <span className="text-sm">{task.taskName}</span>
              <Badge variant="outline" className="text-xs">
                {FREQUENCY_LABELS[task.frequency]}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
