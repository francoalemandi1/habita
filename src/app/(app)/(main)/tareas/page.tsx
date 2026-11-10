import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TareasScreen } from "@/components/features/tareas/tareas-screen";

export default async function TareasPage(): Promise<React.JSX.Element> {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/onboarding");
  }

  const members = await prisma.member.findMany({
    where: { householdId: member.householdId, isActive: true },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  return <TareasScreen members={members} currentMemberId={member.id} />;
}
