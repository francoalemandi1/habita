import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TareasDetailHeader } from "@/components/features/tareas/tareas-detail-header";
import { RotacionesView } from "@/components/features/tareas/rotaciones-view";

interface RotacionesPageProps {
  searchParams: Promise<{ sorteo?: string }>;
}

export default async function RotacionesPage({ searchParams }: RotacionesPageProps) {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/onboarding");
  }

  const { sorteo } = await searchParams;

  const members = await prisma.member.findMany({
    where: { householdId: member.householdId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <TareasDetailHeader title="Rotaciones" />
      <div className="mt-4">
        <RotacionesView members={members} currentMemberId={member.id} initialSorteoOpen={sorteo === "1"} />
      </div>
    </div>
  );
}
