import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { updateRecurringExpenseSchema } from "@/lib/validations/recurring-expense";
import { calculateNextDueDate } from "@/lib/recurring-expense-utils";
import { handleApiError } from "@/lib/api-response";
import { Prisma } from "@prisma/client";

import type { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/expenses/recurring/[id]
 * Update a recurring expense template.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { id } = await context.params;

    const existing = await prisma.recurringExpense.findFirst({
      where: { id, householdId: member.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Gasto recurrente no encontrado" }, { status: 404 });
    }

    const body = (await request.json()) as unknown;
    const validation = updateRecurringExpenseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    // If frequency changed, recalculate nextDueDate
    let nextDueDate = data.nextDueDate ? new Date(data.nextDueDate) : undefined;
    if (data.frequency && data.frequency !== existing.frequency && !data.nextDueDate) {
      nextDueDate = calculateNextDueDate(
        data.frequency,
        new Date(),
        data.dayOfMonth ?? existing.dayOfMonth,
        data.dayOfWeek ?? existing.dayOfWeek,
      );
    }

    // If paidById changed, verify membership
    if (data.paidById && data.paidById !== existing.paidById) {
      const paidByMember = await prisma.member.findFirst({
        where: { id: data.paidById, householdId: member.householdId, isActive: true },
      });
      if (!paidByMember) {
        return NextResponse.json(
          { error: "El miembro que paga no pertenece al hogar" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.recurringExpense.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.amount !== undefined && { amount: new Prisma.Decimal(data.amount.toFixed(2)) }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.splitType !== undefined && { splitType: data.splitType }),
        ...(data.paidById !== undefined && { paidById: data.paidById }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.frequency !== undefined && { frequency: data.frequency }),
        ...(data.dayOfMonth !== undefined && { dayOfMonth: data.dayOfMonth }),
        ...(data.dayOfWeek !== undefined && { dayOfWeek: data.dayOfWeek }),
        ...(data.autoGenerate !== undefined && { autoGenerate: data.autoGenerate }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(nextDueDate && { nextDueDate }),
      },
      include: { paidBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      ...updated,
      amount: updated.amount.toNumber(),
      nextDueDate: updated.nextDueDate.toISOString(),
      lastGeneratedAt: updated.lastGeneratedAt?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses/recurring/[id]", method: "PATCH" });
  }
}

/**
 * DELETE /api/expenses/recurring/[id]
 * Delete a recurring expense template.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { id } = await context.params;

    const existing = await prisma.recurringExpense.findFirst({
      where: { id, householdId: member.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Gasto recurrente no encontrado" }, { status: 404 });
    }

    await prisma.recurringExpense.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses/recurring/[id]", method: "DELETE" });
  }
}
