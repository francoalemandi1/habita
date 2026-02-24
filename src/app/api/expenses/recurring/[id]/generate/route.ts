import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { buildSplitsData } from "@/lib/expense-splits";
import { calculateNextDueDate } from "@/lib/recurring-expense-utils";
import { handleApiError } from "@/lib/api-response";
import { Prisma } from "@prisma/client";

import type { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/expenses/recurring/[id]/generate
 * Generate a real expense from a recurring template and advance the next due date.
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { id } = await context.params;

    const template = await prisma.recurringExpense.findFirst({
      where: { id, householdId: member.householdId, isActive: true },
    });

    if (!template) {
      return NextResponse.json({ error: "Gasto recurrente no encontrado" }, { status: 404 });
    }

    // Build splits
    const splitsResult = await buildSplitsData({
      householdId: member.householdId,
      amount: template.amount.toNumber(),
      splitType: template.splitType,
    });

    if (!splitsResult.ok) {
      return NextResponse.json({ error: splitsResult.error }, { status: 400 });
    }

    // Calculate next due date
    const nextDueDate = calculateNextDueDate(
      template.frequency,
      template.nextDueDate,
      template.dayOfMonth,
      template.dayOfWeek,
    );

    // Create expense and advance template in a transaction
    const [expense] = await prisma.$transaction([
      prisma.expense.create({
        data: {
          householdId: member.householdId,
          paidById: template.paidById,
          title: template.title,
          amount: template.amount,
          currency: template.currency,
          category: template.category,
          splitType: template.splitType,
          notes: template.notes,
          splits: { create: splitsResult.data },
        },
        include: {
          paidBy: { select: { id: true, name: true } },
          splits: { include: { member: { select: { id: true, name: true } } } },
        },
      }),
      prisma.recurringExpense.update({
        where: { id },
        data: {
          nextDueDate,
          lastGeneratedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      ...expense,
      amount: expense.amount.toNumber(),
      splits: expense.splits.map((s) => ({ ...s, amount: s.amount.toNumber() })),
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses/recurring/[id]/generate", method: "POST" });
  }
}
