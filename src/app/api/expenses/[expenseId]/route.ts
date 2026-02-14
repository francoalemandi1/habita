import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { updateExpenseSchema } from "@/lib/validations/expense";

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

/**
 * PATCH /api/expenses/[expenseId]
 * Update an expense's title, amount, category, or notes.
 * If amount changes on an EQUAL split, recalculates all splits.
 * If amount changes on a CUSTOM split, rejects with 400.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { expenseId } = await context.params;
    const body = await request.json();
    const validation = updateExpenseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = validation.data;
    const householdId = member.householdId;

    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, householdId },
      select: { id: true, amount: true, splitType: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
    }

    const amountChanged = data.amount !== undefined && data.amount !== existing.amount.toNumber();

    // Block amount changes on CUSTOM/PERCENTAGE splits
    if (amountChanged && existing.splitType !== "EQUAL") {
      return NextResponse.json(
        { error: "Para cambiar el monto de un gasto con división custom, eliminá y creá de nuevo" },
        { status: 400 },
      );
    }

    // Build update payload (only changed fields)
    const updateData: Prisma.ExpenseUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.amount !== undefined) updateData.amount = new Prisma.Decimal(data.amount.toFixed(2));

    // If amount changed on EQUAL split, recalculate all splits
    if (amountChanged && data.amount !== undefined) {
      const activeMembers = await prisma.member.findMany({
        where: { householdId, isActive: true },
        select: { id: true },
      });

      const shareAmount = data.amount / activeMembers.length;

      await prisma.$transaction([
        prisma.expense.update({
          where: { id: expenseId },
          data: updateData,
        }),
        // Delete old splits and recreate with new amounts
        prisma.expenseSplit.deleteMany({ where: { expenseId } }),
        prisma.expenseSplit.createMany({
          data: activeMembers.map((m) => ({
            expenseId,
            memberId: m.id,
            amount: new Prisma.Decimal(shareAmount.toFixed(2)),
          })),
        }),
      ]);
    } else {
      await prisma.expense.update({
        where: { id: expenseId },
        data: updateData,
      });
    }

    // Return updated expense
    const updated = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: {
          include: { member: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json({
      ...updated,
      amount: updated!.amount.toNumber(),
      splits: updated!.splits.map((s) => ({ ...s, amount: s.amount.toNumber() })),
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses/[expenseId]", method: "PATCH" });
  }
}
