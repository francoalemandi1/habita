import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { verifyCsrfOrigin } from "@/lib/csrf";
import { ForbiddenError } from "@/lib/errors";
import { settleBetweenSchema } from "@/lib/validations/expense";
import { getHouseholdBalances } from "@/lib/expense-balances";

/**
 * POST /api/expenses/settle-between
 * Settle the pair's CURRENT net debt, using the simplified transaction
 * between them in every currency where one exists.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfBlocked = verifyCsrfOrigin(request);
    if (csrfBlocked) return csrfBlocked;

    const member = await requireMember();
    const body = await request.json();
    const validation = settleBetweenSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const { fromMemberId, toMemberId } = validation.data;
    const householdId = member.householdId;

    if (member.memberType !== "ADULT" && member.id !== fromMemberId && member.id !== toMemberId) {
      throw new ForbiddenError("Solo un adulto o alguien involucrado puede saldar esta deuda");
    }

    const memberCount = await prisma.member.count({
      where: { id: { in: [fromMemberId, toMemberId] }, householdId, isActive: true },
    });

    if (memberCount !== 2) {
      return NextResponse.json(
        { error: "Ambos miembros deben pertenecer al hogar" },
        { status: 400 },
      );
    }

    const { byCurrency } = await getHouseholdBalances(householdId);
    const pairTransactions = Object.entries(byCurrency).flatMap(([currency, data]) =>
      data.transactions
        .filter(
          (t) =>
            (t.fromMemberId === fromMemberId && t.toMemberId === toMemberId) ||
            (t.fromMemberId === toMemberId && t.toMemberId === fromMemberId),
        )
        .map((transaction) => ({ currency, transaction })),
    );

    if (pairTransactions.length === 0) {
      return NextResponse.json({ settledCount: 0, totalAmount: 0 });
    }

    const totalAmount = pairTransactions.reduce((sum, entry) => sum + entry.transaction.amount, 0);

    await prisma.$transaction(
      pairTransactions.map(({ currency, transaction }) =>
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
      settledCount: pairTransactions.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses/settle-between", method: "POST" });
  }
}
