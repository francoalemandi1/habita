import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{ expenseId: string }>;
}

/**
 * GET /api/expenses/[expenseId]
 * Get a single expense with splits.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { expenseId } = await context.params;

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, householdId: member.householdId },
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: {
          include: { member: { select: { id: true, name: true } } },
        },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      ...expense,
      amount: expense.amount.toNumber(),
      splits: expense.splits.map((s) => ({ ...s, amount: s.amount.toNumber() })),
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses/[expenseId]", method: "GET" });
  }
}

/**
 * DELETE /api/expenses/[expenseId]
 * Delete an expense (cascade deletes splits).
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { expenseId } = await context.params;

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, householdId: member.householdId },
      select: { id: true },
    });

    if (!expense) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
    }

    await prisma.expense.delete({ where: { id: expenseId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses/[expenseId]", method: "DELETE" });
  }
}
