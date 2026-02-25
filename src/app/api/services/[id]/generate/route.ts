import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { buildSplitsData } from "@/lib/expense-splits";
import { calculateNextDueDate, formatPeriod } from "@/lib/service-utils";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/services/[id]/generate
 * Generate a real expense from a service, creating an Invoice and Expense in a transaction.
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { id } = await context.params;

    const service = await prisma.service.findFirst({
      where: { id, householdId: member.householdId, isActive: true },
    });

    if (!service) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    if (service.lastAmount == null) {
      return NextResponse.json(
        { error: "El servicio no tiene monto configurado" },
        { status: 400 },
      );
    }

    const amount = service.lastAmount.toNumber();

    // Build splits
    const splitsResult = await buildSplitsData({
      householdId: member.householdId,
      amount,
      splitType: service.splitType,
    });

    if (!splitsResult.ok) {
      return NextResponse.json({ error: splitsResult.error }, { status: 400 });
    }

    // Calculate next due date and period
    const nextDueDate = calculateNextDueDate(
      service.frequency,
      service.nextDueDate,
      service.dayOfMonth,
      service.dayOfWeek,
    );
    const period = formatPeriod(service.nextDueDate);

    // Create Expense + Invoice + advance Service in a transaction
    const expense = await prisma.$transaction(async (tx) => {
      const createdExpense = await tx.expense.create({
        data: {
          householdId: member.householdId,
          paidById: service.paidById,
          title: service.title,
          amount: service.lastAmount!,
          currency: service.currency,
          category: service.category,
          splitType: service.splitType,
          notes: service.notes,
          splits: { create: splitsResult.data },
        },
        include: {
          paidBy: { select: { id: true, name: true } },
          splits: { include: { member: { select: { id: true, name: true } } } },
        },
      });

      await tx.invoice.create({
        data: {
          serviceId: service.id,
          householdId: member.householdId,
          period,
          amount: service.lastAmount!,
          dueDate: service.nextDueDate,
          status: "PAID",
          expenseId: createdExpense.id,
        },
      });

      await tx.service.update({
        where: { id: service.id },
        data: {
          nextDueDate,
          lastGeneratedAt: new Date(),
        },
      });

      return createdExpense;
    });

    return NextResponse.json({
      ...expense,
      amount: expense.amount.toNumber(),
      splits: expense.splits.map((s) => ({ ...s, amount: s.amount.toNumber() })),
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: "/api/services/[id]/generate", method: "POST" });
  }
}
