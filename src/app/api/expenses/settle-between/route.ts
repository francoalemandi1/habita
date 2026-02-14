import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { settleBetweenSchema } from "@/lib/validations/expense";

/**
 * POST /api/expenses/settle-between
 * Settle all debts between two members in a single transaction.
 * fromMember owes toMember — marks all matching unsettled splits as settled.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body = await request.json();
    const validation = settleBetweenSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { fromMemberId, toMemberId } = validation.data;
    const householdId = member.householdId;

    // Validate both members belong to this household
    const memberCount = await prisma.member.count({
      where: {
        id: { in: [fromMemberId, toMemberId] },
        householdId,
        isActive: true,
      },
    });

    if (memberCount !== 2) {
      return NextResponse.json(
        { error: "Ambos miembros deben pertenecer al hogar" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find all unsettled splits where fromMember owes toMember
      // (toMember paid the expense, fromMember has an unsettled split)
      const splitsToSettle = await tx.expenseSplit.findMany({
        where: {
          settled: false,
          memberId: fromMemberId,
          expense: {
            householdId,
            paidById: toMemberId,
          },
        },
        select: { id: true, amount: true },
      });

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
    return handleApiError(error, { route: "/api/expenses/settle-between", method: "POST" });
  }
}
