import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { verifyCsrfOrigin } from "@/lib/csrf";

import type { NextRequest } from "next/server";

/**
 * POST /api/expenses/settle-all
 * Settle every unsettled split in the household where the split member
 * is not the one who paid, in a single transaction.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfBlocked = verifyCsrfOrigin(request);
    if (csrfBlocked) return csrfBlocked;

    const member = await requireMember();
    const householdId = member.householdId;

    const result = await prisma.$transaction(async (tx) => {
      const unsettledSplits = await tx.expenseSplit.findMany({
        where: {
          settled: false,
          expense: { householdId },
        },
        select: {
          id: true,
          memberId: true,
          amount: true,
          expense: { select: { paidById: true } },
        },
      });

      const splitsToSettle = unsettledSplits.filter(
        (s) => s.memberId !== s.expense.paidById,
      );

      if (splitsToSettle.length === 0) {
        return { settledCount: 0, totalAmount: 0 };
      }

      const splitIds = splitsToSettle.map((s) => s.id);
      const totalAmount = splitsToSettle.reduce(
        (sum, s) => sum + s.amount.toNumber(),
        0,
      );

      await tx.expenseSplit.updateMany({
        where: { id: { in: splitIds } },
        data: { settled: true, settledAt: new Date() },
      });

      return {
        settledCount: splitIds.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses/settle-all", method: "POST" });
  }
}
