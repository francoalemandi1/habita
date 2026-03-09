import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FundPage } from "@/components/features/fund-page";
import { PageHeader } from "@/components/ui/page-header";
import { spacing } from "@/lib/design-tokens";

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
    <div className={spacing.pageContainer}>
      <PageHeader backButton icon={Wallet} title="Fondo Común" subtitle="Administrá el fondo compartido del hogar." />
      <FundPage allMembers={allMembers} currentMemberId={member.id} />
    </div>
  );
}
