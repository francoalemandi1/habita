import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getHouseholdBalances } from "@/lib/expense-balances";
import { summarizeMyBalance } from "@habita/domain";
import { PlataSegments } from "@/components/features/plata/plata-segments";
import { GastosView } from "@/components/features/plata/gastos/gastos-view";
import { SaldosView } from "@/components/features/plata/saldos-view";
import { FondoView } from "@/components/features/plata/fondo-view";

import type { PlataViewKey } from "@/components/features/plata/plata-segments";

const PAGE_SIZE = 30;

function resolveView(value: string | string[] | undefined): PlataViewKey {
  return value === "saldos" || value === "fondo" ? value : "gastos";
}

interface PlataPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PlataPage({ searchParams }: PlataPageProps): Promise<React.JSX.Element> {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/onboarding");
  }

  const params = await searchParams;
  const view = resolveView(params.v);
  const householdId = member.householdId;

  const members = await prisma.member.findMany({
    where: { householdId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const viewProps = { currentMemberId: member.id, currentMemberType: member.memberType, members };

  let gastosExtra: React.ComponentProps<typeof GastosView> | null = null;
  if (view === "gastos") {
    const [expenses, total, { byCurrency, primaryCurrency }] = await Promise.all([
      prisma.expense.findMany({
        where: { householdId },
        include: { paidBy: { select: { id: true, name: true } }, splits: { select: { memberId: true } } },
        orderBy: { date: "desc" },
        take: PAGE_SIZE,
      }),
      prisma.expense.count({ where: { householdId } }),
      getHouseholdBalances(householdId),
    ]);

    const transactions = byCurrency[primaryCurrency]?.transactions ?? [];
    const { owedToMe, iOwe, isSettled } = summarizeMyBalance(transactions, member.id);

    gastosExtra = {
      ...viewProps,
      initialExpenses: expenses.map((expense) => ({
        id: expense.id,
        title: expense.title,
        amount: expense.amount.toNumber(),
        date: expense.date.toISOString(),
        category: expense.category,
        paidBy: expense.paidBy,
        splits: expense.splits,
      })),
      initialHasMore: expenses.length < total,
      owedToMe,
      iOwe,
      isSettled,
    };
  }

  return (
    <div className="flex flex-col gap-6 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[32px] font-bold leading-[1.05] tracking-[-.035em] text-ink">Plata</h1>
        <PlataSegments active={view} />
      </div>

      {view === "gastos" && gastosExtra && <GastosView {...gastosExtra} />}
      {view === "saldos" && <SaldosView {...viewProps} />}
      {view === "fondo" && <FondoView {...viewProps} />}
    </div>
  );
}
