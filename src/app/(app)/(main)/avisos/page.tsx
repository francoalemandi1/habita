import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NotificationsPage } from "@/components/features/notifications-page";
import { PendingTransfersList } from "@/components/features/avisos/pending-transfers-list";

export const metadata = {
  title: "Notificaciones",
};

export default async function NotificationsServerPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const incomingTransfers = await prisma.taskTransfer.findMany({
    where: { toMemberId: member.id, status: "PENDING", assignment: { householdId: member.householdId } },
    select: { id: true, fromMember: { select: { name: true } }, assignment: { select: { task: { select: { name: true } } } } },
    orderBy: { requestedAt: "desc" },
  });

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <PendingTransfersList
        transfers={incomingTransfers.map((t) => ({
          id: t.id,
          taskName: t.assignment.task.name,
          fromMemberName: t.fromMember.name,
        }))}
      />
      <NotificationsPage />
    </div>
  );
}
