import { redirect } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PendingTransfers } from "@/components/features/pending-transfers";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { spacing } from "@/lib/design-tokens";

export const metadata = {
  title: "Transferencias",
};

export default async function TransfersPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const transfers = await prisma.taskTransfer.findMany({
    where: {
      OR: [
        { fromMemberId: member.id },
        { toMemberId: member.id },
      ],
      assignment: {
        householdId: member.householdId,
      },
    },
    include: {
      assignment: {
        include: {
          task: { select: { id: true, name: true } },
        },
      },
      fromMember: { select: { id: true, name: true } },
      toMember: { select: { id: true, name: true } },
    },
    orderBy: { requestedAt: "desc" },
    take: 50,
  });

  return (
    <div className={spacing.pageContainer}>
      <PageHeader
        backButton
        icon={ArrowLeftRight}
        title="Transferencias"
        subtitle="Liquidá saldos entre miembros"
      />

      {transfers.length > 0 ? (
        <PendingTransfers
          transfers={transfers}
          currentMemberId={member.id}
        />
      ) : (
        <EmptyState
          emoji="🔄"
          title="Sin transferencias"
          description="Cuando alguien solicite transferir una tarea, aparecerá acá."
        />
      )}
    </div>
  );
}
