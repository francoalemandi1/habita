import { notFound, redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ExpenseDetailView } from "@/components/features/plata/expense-detail/expense-detail-view";

import type { SerializedExpense } from "@/types/expense";

interface ExpenseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExpenseDetailPage({ params }: ExpenseDetailPageProps): Promise<React.JSX.Element> {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/onboarding");
  }

  const { id } = await params;

  const expense = await prisma.expense.findFirst({
    where: { id, householdId: member.householdId },
    include: {
      paidBy: { select: { id: true, name: true } },
      splits: { include: { member: { select: { id: true, name: true } } } },
      invoice: { select: { id: true, pdfUrl: true } },
    },
  });

  if (!expense) {
    notFound();
  }

  const splitMemberIds = expense.splits.map((split) => split.memberId);
  const laterSettlement = splitMemberIds.length
    ? await prisma.settlement.findFirst({
        where: {
          householdId: member.householdId,
          settledAt: { gte: expense.createdAt },
          OR: [
            { fromMemberId: expense.paidById, toMemberId: { in: splitMemberIds } },
            { toMemberId: expense.paidById, fromMemberId: { in: splitMemberIds } },
          ],
        },
        select: { id: true },
      })
    : null;

  const canEdit = member.memberType === "ADULT" || member.id === expense.paidById;

  const serialized: SerializedExpense = {
    id: expense.id,
    title: expense.title,
    amount: expense.amount.toNumber(),
    currency: expense.currency,
    category: expense.category,
    subcategory: expense.subcategory,
    splitType: expense.splitType,
    date: expense.date.toISOString(),
    notes: expense.notes,
    paidBy: expense.paidBy,
    splits: expense.splits.map((split) => ({
      id: split.id,
      memberId: split.memberId,
      amount: split.amount.toNumber(),
      settled: split.settled,
      settledAt: split.settledAt ? split.settledAt.toISOString() : null,
      member: split.member,
    })),
  };

  return (
    <ExpenseDetailView
      expense={serialized}
      currentMemberId={member.id}
      canEdit={canEdit}
      hasLaterSettlement={laterSettlement !== null}
      invoice={expense.invoice}
    />
  );
}
