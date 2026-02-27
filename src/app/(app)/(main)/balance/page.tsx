import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isSoloHousehold } from "@/lib/household-mode";
import { ExpensesView } from "@/components/features/expenses-view";

export default async function BalancePage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const householdId = member.householdId;

  const [expenses, activeMembers] = await Promise.all([
    prisma.expense.findMany({
      where: { householdId },
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
      where: { householdId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedExpenses = expenses.map((e) => ({
    ...e,
    amount: e.amount.toNumber(),
    date: e.date.toISOString(),
    splits: e.splits.map((s) => ({
      ...s,
      amount: s.amount.toNumber(),
      settledAt: s.settledAt?.toISOString() ?? null,
    })),
  }));

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <ExpensesView
        initialExpenses={serializedExpenses}
        currentMemberId={member.id}
        allMembers={activeMembers}
        householdCity={member.household.city ?? null}
        isSolo={isSoloHousehold(activeMembers.length)}
      />
    </div>
  );
}
