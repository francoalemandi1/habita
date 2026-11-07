import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { settleSchema } from "@/lib/validations/expense";
import { handleApiError } from "@/lib/api-response";
import { ForbiddenError } from "@/lib/errors";

import type { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{ expenseId: string }>;
}

/**
 * POST /api/expenses/[expenseId]/settle
 * Record one settlement per selected non-payer split, from the split
 * member to the expense's payer.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { expenseId } = await context.params;
    const body = (await request.json()) as unknown;
    const validation = settleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, householdId: member.householdId },
      select: {
        id: true,
        paidById: true,
        currency: true,
        splits: {
          where: { id: { in: validation.data.splitIds } },
          select: { id: true, memberId: true, amount: true },
        },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
    }

    const splitsToSettle = expense.splits.filter((s) => s.memberId !== expense.paidById);

    if (member.memberType !== "ADULT" && member.id !== expense.paidById) {
      const ownsEverySplit = splitsToSettle.every((s) => s.memberId === member.id);
      if (!ownsEverySplit) {
        throw new ForbiddenError("Solo quien pagó o un adulto puede saldar la parte de otra persona");
      }
    }

    if (splitsToSettle.length === 0) {
      return NextResponse.json({ settled: 0 });
    }

    await prisma.$transaction(
      splitsToSettle.map((split) =>
        prisma.settlement.create({
          data: {
            householdId: member.householdId,
            fromMemberId: split.memberId,
            toMemberId: expense.paidById,
            amount: new Prisma.Decimal(split.amount.toFixed(2)),
            currency: expense.currency,
            createdById: member.id,
          },
        }),
      ),
    );

    return NextResponse.json({ settled: splitsToSettle.length });
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses/[expenseId]/settle", method: "POST" });
  }
}
