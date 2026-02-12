import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { settleSchema } from "@/lib/validations/expense";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{ expenseId: string }>;
}

/**
 * POST /api/expenses/[expenseId]/settle
 * Mark specific splits as settled.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { expenseId } = await context.params;
    const body = (await request.json()) as unknown;
    const validation = settleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    // Verify expense belongs to household
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, householdId: member.householdId },
      select: { id: true },
    });

    if (!expense) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
    }

    const now = new Date();
    const result = await prisma.expenseSplit.updateMany({
      where: {
        id: { in: validation.data.splitIds },
        expenseId,
        settled: false,
      },
      data: {
        settled: true,
        settledAt: now,
      },
    });

    return NextResponse.json({ settled: result.count });
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses/[expenseId]/settle", method: "POST" });
  }
}
