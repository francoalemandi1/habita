import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { verifyCsrfOrigin } from "@/lib/csrf";
import { ForbiddenError } from "@/lib/errors";
import { getHouseholdBalances } from "@/lib/expense-balances";

import type { NextRequest } from "next/server";
import type { CurrentMember } from "@/lib/session";
import type { DebtTransaction } from "@/lib/expense-balances";

/** An ADULT may settle everything; anyone else must be a party to every transaction. */
function assertCanSettleAll(member: CurrentMember, transactions: DebtTransaction[]): void {
  if (member.memberType === "ADULT") return;
  const isPartyToAll = transactions.every(
    (t) => t.fromMemberId === member.id || t.toMemberId === member.id,
  );
  if (!isPartyToAll) {
    throw new ForbiddenError("Solo un adulto puede saldar deudas de otras personas");
  }
}

/**
 * POST /api/expenses/settle-all
 * Record one settlement per simplified transaction, across every currency.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfBlocked = verifyCsrfOrigin(request);
    if (csrfBlocked) return csrfBlocked;

    const member = await requireMember();
    const householdId = member.householdId;

    const { byCurrency } = await getHouseholdBalances(householdId);
    const perCurrencyTransactions = Object.entries(byCurrency).flatMap(([currency, data]) =>
      data.transactions.map((transaction) => ({ currency, transaction })),
    );

    assertCanSettleAll(
      member,
      perCurrencyTransactions.map((entry) => entry.transaction),
    );

    if (perCurrencyTransactions.length === 0) {
      return NextResponse.json({ settledCount: 0, totalAmount: 0 });
    }

    const totalAmount = perCurrencyTransactions.reduce((sum, entry) => sum + entry.transaction.amount, 0);

    await prisma.$transaction(
      perCurrencyTransactions.map(({ currency, transaction }) =>
        prisma.settlement.create({
          data: {
            householdId,
            fromMemberId: transaction.fromMemberId,
            toMemberId: transaction.toMemberId,
            amount: new Prisma.Decimal(transaction.amount.toFixed(2)),
            currency,
            createdById: member.id,
          },
        }),
      ),
    );

    return NextResponse.json({
      settledCount: perCurrencyTransactions.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses/settle-all", method: "POST" });
  }
}
