import { prisma } from "@/lib/prisma";

import type { MemberType } from "@prisma/client";
import type { SerializedExpense } from "@/types/expense";

export interface ExpenseDetailData {
  expense: SerializedExpense;
  canEdit: boolean;
  hasLaterSettlement: boolean;
  invoice: { id: string; pdfUrl: string | null } | null;
}

interface LoadExpenseDetailParams {
  householdId: string;
  expenseId: string;
  currentMemberId: string;
  memberType: MemberType;
}

/** Shared by the expense detail page and its API route (desktop split-panel). */
export async function loadExpenseDetail({
  householdId,
  expenseId,
  currentMemberId,
  memberType,
}: LoadExpenseDetailParams): Promise<ExpenseDetailData | null> {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, householdId },
    include: {
      paidBy: { select: { id: true, name: true } },
      splits: { include: { member: { select: { id: true, name: true } } } },
      invoice: { select: { id: true, pdfUrl: true } },
    },
  });

  if (!expense) {
    return null;
  }

  const splitMemberIds = expense.splits.map((split) => split.memberId);
  const laterSettlement = splitMemberIds.length
    ? await prisma.settlement.findFirst({
        where: {
          householdId,
          settledAt: { gte: expense.createdAt },
          OR: [
            { fromMemberId: expense.paidById, toMemberId: { in: splitMemberIds } },
            { toMemberId: expense.paidById, fromMemberId: { in: splitMemberIds } },
          ],
        },
        select: { id: true },
      })
    : null;

  const canEdit = memberType === "ADULT" || currentMemberId === expense.paidById;

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

  return {
    expense: serialized,
    canEdit,
    hasLaterSettlement: laterSettlement !== null,
    invoice: expense.invoice,
  };
}
