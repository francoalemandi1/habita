"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock } from "lucide-react";

import type { Member, MemberLevel, Assignment, Task, MemberType } from "@prisma/client";

interface AssignmentWithTask extends Assignment {
  task: Pick<Task, "name" | "weight">;
}

interface KidWithDetails extends Member {
  level: MemberLevel | null;
  assignments: AssignmentWithTask[];
}

interface KidsSummaryProps {
  kids: KidWithDetails[];
}

export function KidsSummary({ kids }: KidsSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {kids.map((kid) => {
        const pending = kid.assignments.filter(
          (a) => a.status === "PENDING" || a.status === "IN_PROGRESS"
        );
        const completed = kid.assignments.filter(
          (a) => a.status === "COMPLETED" || a.status === "VERIFIED"
        );

        return (
          <Card key={kid.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{kid.name}</CardTitle>
                <Badge variant="outline">
                  {kid.memberType === "CHILD" ? "Niño" : "Adolescente"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Task stats */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-2xl bg-yellow-100 p-2 dark:bg-yellow-900">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="font-bold">{pending.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                </div>

                <div className="rounded-2xl bg-green-100 p-2 dark:bg-green-900">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-bold">{completed.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Completadas</p>
                </div>
              </div>

              {/* Recent tasks */}
              {kid.assignments.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Tareas recientes
                  </p>
                  <div className="space-y-1">
                    {kid.assignments.slice(0, 3).map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="truncate">{assignment.task.name}</span>
                        <StatusBadge status={assignment.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
      return <Badge className="bg-blue-100 text-blue-700">Por verificar</Badge>;
    case "VERIFIED":
      return <Badge className="bg-green-100 text-green-700">Verificada</Badge>;
    case "PENDING":
    case "IN_PROGRESS":
      return <Badge variant="outline">Pendiente</Badge>;
    default:
      return null;
  }
}
