import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ServicesPage } from "@/components/features/services-page";

export const metadata = {
  title: "Servicios",
};

export default async function PlataServiciosPage(): Promise<React.JSX.Element> {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const allMembers = await prisma.member.findMany({
    where: { householdId: member.householdId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 px-5 py-4">
      <ServicesPage allMembers={allMembers} currentMemberId={member.id} />
    </div>
  );
}
