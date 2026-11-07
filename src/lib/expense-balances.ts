import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeBalancesByCurrency, simplifyDebts } from "@habita/domain/money-balances";

import type { MemberBalance, DebtTransaction, MoneyMember, MoneySplit, MoneySettlement } from "@habita/domain/money-balances";

export type { MemberBalance, DebtTransaction };

const splitAggregateRowSchema = z.object({
  memberId: z.string(),
  payerId: z.string(),
  currency: z.string(),
  totalAmount: z.string(),
});

const settlementAggregateRowSchema = z.object({
  fromMemberId: z.string(),
  toMemberId: z.string(),
  currency: z.string(),
  totalAmount: z.string(),
});

export interface HouseholdBalances {
  byCurrency: Record<string, { balances: MemberBalance[]; transactions: DebtTransaction[] }>;
  primaryCurrency: string;
}

async function loadSplitAggregates(householdId: string): Promise<MoneySplit[]> {
  const rows = await prisma.$queryRaw<unknown[]>`
    SELECT es."memberId" AS "memberId", e."paidById" AS "payerId", e."currency" AS "currency",
      SUM(es."amount")::text AS "totalAmount"
    FROM expense_splits es
    JOIN expenses e ON e.id = es."expenseId"
    WHERE e."householdId" = ${householdId} AND es."memberId" != e."paidById"
    GROUP BY es."memberId", e."paidById", e."currency"
  `;

  return rows.map((row) => {
    const parsed = splitAggregateRowSchema.parse(row);
    return { memberId: parsed.memberId, payerId: parsed.payerId, amount: parsed.totalAmount, currency: parsed.currency };
  });
}

async function loadSettlementAggregates(householdId: string): Promise<MoneySettlement[]> {
  const rows = await prisma.$queryRaw<unknown[]>`
    SELECT "fromMemberId", "toMemberId", currency, SUM(amount)::text AS "totalAmount"
    FROM settlements
    WHERE "householdId" = ${householdId}
    GROUP BY "fromMemberId", "toMemberId", currency
  `;

  return rows.map((row) => {
    const parsed = settlementAggregateRowSchema.parse(row);
    return { fromMemberId: parsed.fromMemberId, toMemberId: parsed.toMemberId, amount: parsed.totalAmount, currency: parsed.currency };
  });
}

async function resolvePrimaryCurrency(householdId: string): Promise<string> {
  const counts = await prisma.expense.groupBy({
    by: ["currency"],
    where: { householdId },
    _count: { _all: true },
  });

  if (counts.length === 0) return "ARS";

  return counts.reduce((best, current) => (current._count._all > best._count._all ? current : best)).currency;
}

/**
 * Load every balance input for a household (members, aggregated splits,
 * aggregated settlements) and compute net balances + simplified transactions
 * per currency. Members are included even if inactive, since historical
 * splits/settlements may still reference them.
 */
export async function getHouseholdBalances(householdId: string): Promise<HouseholdBalances> {
  const [members, splits, settlements, primaryCurrency] = await Promise.all([
    prisma.member.findMany({ where: { householdId }, select: { id: true, name: true } }),
    loadSplitAggregates(householdId),
    loadSettlementAggregates(householdId),
    resolvePrimaryCurrency(householdId),
  ]);

  const moneyMembers: MoneyMember[] = members.map((member) => ({ id: member.id, name: member.name }));
  const balancesByCurrency = computeBalancesByCurrency({ members: moneyMembers, splits, settlements });

  const byCurrency: HouseholdBalances["byCurrency"] = {};
  for (const [currency, balances] of Object.entries(balancesByCurrency)) {
    byCurrency[currency] = { balances, transactions: simplifyDebts(balances) };
  }

  return { byCurrency, primaryCurrency };
}
