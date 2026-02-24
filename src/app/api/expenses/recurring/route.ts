import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { createRecurringExpenseSchema } from "@/lib/validations/recurring-expense";
import { handleApiError } from "@/lib/api-response";
import { Prisma } from "@prisma/client";

import type { NextRequest } from "next/server";

function serializeRecurring(e: {
  id: string;
  title: string;
  amount: Prisma.Decimal;
  currency: string;
  category: string;
  splitType: string;
  paidById: string;
  paidBy: { id: string; name: string };
  notes: string | null;
  frequency: string;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  autoGenerate: boolean;
  nextDueDate: Date;
  lastGeneratedAt: Date | null;
  isActive: boolean;
}) {
  return {
    ...e,
    amount: e.amount.toNumber(),
    nextDueDate: e.nextDueDate.toISOString(),
    lastGeneratedAt: e.lastGeneratedAt?.toISOString() ?? null,
  };
}

/**
 * GET /api/expenses/recurring
 * List active recurring expense templates for the household.
 */
export async function GET() {
  try {
    const member = await requireMember();

    const templates = await prisma.recurringExpense.findMany({
      where: { householdId: member.householdId },
      include: { paidBy: { select: { id: true, name: true } } },
      orderBy: [{ isActive: "desc" }, { nextDueDate: "asc" }],
    });

    return NextResponse.json(templates.map(serializeRecurring));
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses/recurring", method: "GET" });
  }
}

/**
 * POST /api/expenses/recurring
 * Create a new recurring expense template.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body = (await request.json()) as unknown;
    const validation = createRecurringExpenseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Verify paidBy member belongs to household
    const paidByMember = await prisma.member.findFirst({
      where: { id: data.paidById, householdId: member.householdId, isActive: true },
    });

    if (!paidByMember) {
      return NextResponse.json(
        { error: "El miembro que paga no pertenece al hogar" },
        { status: 400 },
      );
    }

    const template = await prisma.recurringExpense.create({
      data: {
        householdId: member.householdId,
        title: data.title,
        amount: new Prisma.Decimal(data.amount.toFixed(2)),
        category: data.category,
        splitType: data.splitType,
        paidById: data.paidById,
        notes: data.notes ?? null,
        frequency: data.frequency,
        dayOfMonth: data.dayOfMonth ?? null,
        dayOfWeek: data.dayOfWeek ?? null,
        autoGenerate: data.autoGenerate,
        nextDueDate: new Date(data.nextDueDate),
      },
      include: { paidBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json(serializeRecurring(template), { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses/recurring", method: "POST" });
  }
}
