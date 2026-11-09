import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getHouseholdBalances } from "@/lib/expense-balances";
import { summarizeMyBalance } from "@habita/domain";
import { PlataScreen } from "@/components/features/plata/plata-screen";

const PAGE_SIZE = 30;

export default async function PlataPage(): Promise<React.JSX.Element> {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/onboarding");
  }

  const householdId = member.householdId;

  const [members, expenses, total, { byCurrency, primaryCurrency }] = await Promise.all([
    prisma.member.findMany({
      where: { householdId, isActive: true },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expense.findMany({
      where: { householdId },
      include: { paidBy: { select: { id: true, name: true } }, splits: { select: { memberId: true } } },
      orderBy: { date: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.expense.count({ where: { householdId } }),
    getHouseholdBalances(householdId),
  ]);

  const viewProps = { currentMemberId: member.id, currentMemberType: member.memberType, members };
  const transactions = byCurrency[primaryCurrency]?.transactions ?? [];
  const { owedToMe, iOwe, isSettled } = summarizeMyBalance(transactions, member.id);

  const gastos = {
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

  return <PlataScreen viewProps={viewProps} gastos={gastos} />;
}
