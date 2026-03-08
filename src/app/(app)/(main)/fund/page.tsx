import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FundPage } from "@/components/features/fund-page";

export const metadata = {
  title: "Fondo Común",
};

export default async function FundServerPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const allMembers = await prisma.member.findMany({
    where: { householdId: member.householdId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <FundPage allMembers={allMembers} currentMemberId={member.id} />
    </div>
  );
}
