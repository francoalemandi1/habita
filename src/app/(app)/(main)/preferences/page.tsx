import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PreferencesManager } from "@/components/features/preferences-manager";
import { AbsencesManager } from "@/components/features/absences-manager";
import { Settings } from "lucide-react";
import { spacing } from "@/lib/design-tokens";

export default async function PreferencesPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  // Get member's preferences with task details
  const preferences = await prisma.memberPreference.findMany({
    where: { memberId: member.id },
    include: {
      task: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get all tasks in the household for the preference selector
  const tasks = await prisma.task.findMany({
    where: {
      householdId: member.householdId,
      isActive: true,
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Get member's absences
  const absences = await prisma.memberAbsence.findMany({
    where: { memberId: member.id },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <div className={spacing.pageHeader}>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <Settings className="h-7 w-7" />
          Preferencias
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configura tus preferencias de tareas y ausencias
        </p>
      </div>

      <div className="space-y-12">
        {/* Task preferences section */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">Preferencias de tareas</h2>
          <p className="mb-6 text-muted-foreground">
            Las tareas preferidas tienen +20 puntos en el algoritmo de asignación.
            Las no deseadas tienen -20 puntos. Esto influye en qué tareas te son asignadas.
          </p>
          <PreferencesManager preferences={preferences} tasks={tasks} />
        </section>

        {/* Absences section */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">Ausencias</h2>
          <p className="mb-6 text-muted-foreground">
            Durante tus ausencias no se te asignarán nuevas tareas. Las tareas
            pendientes seguirán asignadas a ti.
          </p>
          <AbsencesManager absences={absences} />
        </section>
      </div>
    </div>
  );
}
