import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ScreenHeader } from "@/components/ds/screen-header";
import { TareasSegments } from "@/components/features/tareas/tareas-segments";
import { SemanaView } from "@/components/features/tareas/semana-view";
import { ListaView } from "@/components/features/tareas/lista-view";
import { RepartoView } from "@/components/features/tareas/reparto-view";

import type { TareasViewKey } from "@/components/features/tareas/tareas-segments";

interface TareasPageProps {
  searchParams: Promise<{ v?: string }>;
}

function resolveView(v: string | undefined): TareasViewKey {
  if (v === "lista" || v === "reparto") return v;
  return "semana";
}

export default async function TareasPage({ searchParams }: TareasPageProps) {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/onboarding");
  }

  const { v } = await searchParams;
  const view = resolveView(v);

  const members = await prisma.member.findMany({
    where: { householdId: member.householdId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <ScreenHeader variant="tab" title="Tareas" />
      <div className="mb-4">
        <TareasSegments active={view} />
      </div>
      {view === "semana" && <SemanaView members={members} currentMemberId={member.id} />}
      {view === "lista" && <ListaView />}
      {view === "reparto" && <RepartoView currentMemberId={member.id} />}
    </div>
  );
}
