import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PendingTransfersList } from "@/components/features/avisos/pending-transfers-list";
import { NovedadesList } from "@/components/features/avisos/novedades-list";
import { PERFIL_ROUTES } from "@habita/contracts";

export const metadata = {
  title: "Avisos",
};

export default async function AvisosPage(): Promise<React.JSX.Element> {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const incomingTransfers = await prisma.taskTransfer.findMany({
    where: { toMemberId: member.id, status: "PENDING", assignment: { householdId: member.householdId } },
    select: { id: true, fromMember: { select: { name: true } }, assignment: { select: { task: { select: { name: true } } } } },
    orderBy: { requestedAt: "desc" },
  });

  const transfers = incomingTransfers.map((t) => ({
    id: t.id,
    taskName: t.assignment.task.name,
    fromMemberName: t.fromMember.name,
  }));

  return (
    <div className="container max-w-4xl space-y-6 px-4 py-6 sm:py-8 md:px-8">
      <h1 className="text-[30px] font-bold text-ink">Avisos</h1>

      {transfers.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <span className="size-2 rounded-full bg-ladrillo" aria-hidden="true" />
            Para resolver
          </h2>
          <PendingTransfersList transfers={transfers} />
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-[15px] font-semibold text-ink">Novedades</h2>
        <NovedadesList />
      </section>

      <Link href={PERFIL_ROUTES.notificationSettings} className="block text-[14px] font-medium text-monte">
        Elegir qué avisos recibir
      </Link>
    </div>
  );
}
