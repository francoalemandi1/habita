import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RotationsList } from "@/components/features/rotations-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotationToggle } from "@/components/features/rotation-toggle";
import { RefreshCw } from "lucide-react";

export default async function RotationsPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  // Get all rotations with task info
  const rotations = await prisma.taskRotation.findMany({
    where: { householdId: member.householdId },
    include: {
      task: {
        select: {
          id: true,
          name: true,
          frequency: true,
          weight: true,
        },
      },
    },
    orderBy: { nextDueDate: "asc" },
  });

  // Get tasks without rotations
  const tasksWithoutRotation = await prisma.task.findMany({
    where: {
      householdId: member.householdId,
      isActive: true,
      rotation: null,
      frequency: { not: "ONCE" }, // Exclude one-time tasks
    },
    select: {
      id: true,
      name: true,
      frequency: true,
    },
    orderBy: { name: "asc" },
  });

  // Count upcoming assignments from rotations
  const now = new Date();
  const upcomingCount = rotations.filter(
    (r) => r.isActive && r.nextDueDate && new Date(r.nextDueDate) > now
  ).length;

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <RefreshCw className="h-7 w-7" />
          Rotaciones automáticas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configura la generación automática de asignaciones
        </p>
      </div>

      {/* Summary */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
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
            <CardTitle className="text-lg">Próximas a generar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{upcomingCount}</p>
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
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">Rotaciones configuradas</h2>
        <RotationsList rotations={rotations} />
      </section>

      {/* Tasks without rotation */}
      {tasksWithoutRotation.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Tareas sin rotación</h2>
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
