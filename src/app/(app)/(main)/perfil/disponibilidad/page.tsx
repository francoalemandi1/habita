import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AvailabilityGrid } from "@/components/features/perfil/availability-grid";
import { TaskPreferences } from "@/components/features/perfil/task-preferences";
import { AbsencesList } from "@/components/features/perfil/absences-list";
import { availabilitySchema } from "@habita/contracts";

import type { AvailabilityGrid as AvailabilityGridValue } from "@habita/domain";
import type { TaskPreferenceItem } from "@/components/features/perfil/task-preferences";

export const metadata = {
  title: "Disponibilidad · Perfil",
};

export default async function PerfilDisponibilidadPage(): Promise<React.JSX.Element> {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const [tasks, preferences, absences] = await Promise.all([
    prisma.task.findMany({
      where: { householdId: member.householdId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.memberPreference.findMany({
      where: { memberId: member.id },
      select: { taskId: true, preference: true },
    }),
    prisma.memberAbsence.findMany({
      where: { memberId: member.id, endDate: { gte: new Date() } },
      select: { id: true, startDate: true, endDate: true, reason: true },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const preferenceByTaskId = new Map(preferences.map((p) => [p.taskId, p.preference]));
  const taskPreferences: TaskPreferenceItem[] = tasks.map((task) => ({
    taskId: task.id,
    taskName: task.name,
    preference: preferenceByTaskId.get(task.id) ?? null,
  }));

  const parsedAvailability = availabilitySchema.nullable().safeParse(member.availability);
  const initialGrid: AvailabilityGridValue | null = parsedAvailability.success ? parsedAvailability.data : null;
  if (!parsedAvailability.success) {
    console.warn("Grilla de disponibilidad inválida, se muestra como disponible todo el día", parsedAvailability.error);
  }

  return (
    <div className="container max-w-4xl space-y-8 px-4 py-6 sm:py-8 md:px-8">
      <h1 className="text-[22px] font-bold text-ink">Disponibilidad</h1>

      <section className="space-y-2">
        <AvailabilityGrid initialGrid={initialGrid} />
      </section>

      <section className="space-y-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[.04em] text-ink-2">Preferencias de tareas</h2>
        <TaskPreferences tasks={taskPreferences} />
      </section>

      <section className="space-y-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[.04em] text-ink-2">Ausencias</h2>
        <AbsencesList
          absences={absences.map((a) => ({
            id: a.id,
            startDate: a.startDate.toISOString(),
            endDate: a.endDate.toISOString(),
            reason: a.reason,
          }))}
        />
      </section>
    </div>
  );
}
