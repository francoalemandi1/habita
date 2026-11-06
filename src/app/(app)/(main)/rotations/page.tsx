import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RotationsList } from "@/components/features/rotations-list";

import type { RotationView } from "@/components/features/rotations-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotationToggle } from "@/components/features/rotation-toggle";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { spacing, typography } from "@/lib/design-tokens";

export default async function RotationsPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  // Rotation is now a flag on Task — no separate schedule, so there is nothing
  // "upcoming to generate": the next occurrence is created right when the
  // current one is completed.
  const rotatingTasks = await prisma.task.findMany({
    where: { householdId: member.householdId, isRotating: true },
    select: { id: true, name: true, frequency: true, weight: true },
    orderBy: { name: "asc" },
  });
  const rotations: RotationView[] = rotatingTasks.map((task) => ({
    id: task.id,
    taskId: task.id,
    frequency: task.frequency,
    isActive: true,
    lastGenerated: null,
    nextDueDate: null,
    task,
  }));

  // Get tasks without rotation
  const tasksWithoutRotation = await prisma.task.findMany({
    where: {
      householdId: member.householdId,
      isActive: true,
      isRotating: false,
      frequency: { not: "ONCE" }, // Exclude one-time tasks
    },
    select: {
      id: true,
      name: true,
      frequency: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <PageHeader
        backButton
        icon={RefreshCw}
        title="Rotaciones automáticas"
        subtitle="Configurá la generación automática de asignaciones"
      />

      {/* Summary */}
      <div className={`${spacing.sectionGapLg} grid gap-4 sm:grid-cols-2`}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Rotaciones activas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {rotations.filter((r) => r.isActive).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Sin rotación</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{tasksWithoutRotation.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active rotations */}
      <section className={spacing.sectionGapXl}>
        <h2 className={`mb-4 ${typography.sectionTitle}`}>Rotaciones configuradas</h2>
        <RotationsList rotations={rotations} />
      </section>

      {/* Tasks without rotation */}
      {tasksWithoutRotation.length > 0 && (
        <section>
          <h2 className={`mb-4 ${typography.sectionTitle}`}>Tareas sin rotación</h2>
          <p className="mb-4 text-muted-foreground">
            Estas tareas recurrentes no tienen rotación activa. Activa una para
            generar asignaciones automáticas.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tasksWithoutRotation.map((task) => (
              <Card key={task.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{task.name}</CardTitle>
                  <CardDescription>
                    <Badge variant="outline">{task.frequency}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RotationToggle
                    taskId={task.id}
                    taskName={task.name}
                    currentRotation={null}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
