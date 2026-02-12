import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ExpenseList } from "@/components/features/expense-list";
import { ExpenseBalances } from "@/components/features/expense-balances";
import { AddExpenseDialog } from "@/components/features/add-expense-dialog";
import { spacing } from "@/lib/design-tokens";

export default async function ExpensesPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const [expenses, activeMembers] = await Promise.all([
    prisma.expense.findMany({
      where: { householdId: member.householdId },
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: {
          include: { member: { select: { id: true, name: true } } },
        },
      },
      orderBy: { date: "desc" },
      take: 20,
    }),
    prisma.member.findMany({
      where: { householdId: member.householdId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized = expenses.map((e) => ({
    ...e,
    amount: e.amount.toNumber(),
    date: e.date.toISOString(),
    splits: e.splits.map((s) => ({ ...s, amount: s.amount.toNumber() })),
  }));

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <div className={spacing.pageHeader}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Gastos del hogar
          </h1>
          <AddExpenseDialog members={activeMembers} currentMemberId={member.id} />
        </div>
      </div>

      <div className={spacing.sectionGap}>
        <ExpenseBalances />
      </div>

      <div className={spacing.sectionGap}>
        <ExpenseList expenses={serialized} />
      </div>
    </div>
  );
}
