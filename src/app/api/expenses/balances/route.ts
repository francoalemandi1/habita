import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { calculateBalances, simplifyDebts } from "@/lib/expense-balances";
import { handleApiError } from "@/lib/api-response";

/**
 * GET /api/expenses/balances
 * Compute who owes whom in the household.
 */
export async function GET() {
  try {
    const member = await requireMember();

    // Only fetch expenses with at least one unsettled split (settled ones don't affect balances)
    const expenses = await prisma.expense.findMany({
      where: {
        householdId: member.householdId,
        splits: { some: { settled: false } },
      },
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: {
          where: { settled: false },
          include: { member: { select: { id: true, name: true } } },
        },
      },
    });

    const balances = calculateBalances(expenses);
    const transactions = simplifyDebts(balances);

    return NextResponse.json({ balances, transactions });
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses/balances", method: "GET" });
  }
}
