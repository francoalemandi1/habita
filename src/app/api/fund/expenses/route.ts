import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { Prisma } from "@prisma/client";

import type { NextRequest } from "next/server";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const createFundExpenseSchema = z.object({
  title: z.string().min(1).max(200),
  amount: z.number().positive(),
  category: z.enum([
    "GROCERIES", "UTILITIES", "RENT", "FOOD", "TRANSPORT",
    "HEALTH", "ENTERTAINMENT", "EDUCATION", "HOME", "OTHER",
  ]).optional(),
  date: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

/**
 * GET /api/fund/expenses
 * List fund expenses for the current household (paginated).
 */
export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();
    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10),
      MAX_LIMIT,
    );
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const fund = await prisma.sharedFund.findUnique({
      where: { householdId: member.householdId },
    });

    if (!fund) {
      return NextResponse.json({ expenses: [], pagination: { total: 0, limit, offset, hasMore: false } });
    }

    const [expenses, total] = await Promise.all([
      prisma.fundExpense.findMany({
        where: { fundId: fund.id },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.fundExpense.count({ where: { fundId: fund.id } }),
    ]);

    const serialized = expenses.map((e) => ({
      id: e.id,
      title: e.title,
      amount: e.amount.toNumber(),
      category: e.category,
      date: e.date.toISOString(),
      notes: e.notes,
      expenseId: e.expenseId,
    }));

    return NextResponse.json({
      expenses: serialized,
      pagination: { total, limit, offset, hasMore: offset + expenses.length < total },
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/fund/expenses", method: "GET" });
  }
}

/**
 * POST /api/fund/expenses
 * Register a manual fund expense (no linked Expense record).
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body = (await request.json()) as unknown;
    const validation = createFundExpenseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const fund = await prisma.sharedFund.findUnique({
      where: { householdId: member.householdId },
    });

    if (!fund) {
      return NextResponse.json({ error: "El fondo no existe" }, { status: 404 });
    }

    if (!fund.isActive) {
      return NextResponse.json({ error: "El fondo está inactivo" }, { status: 400 });
    }

    const { title, amount, category, date, notes } = validation.data;

    const expense = await prisma.fundExpense.create({
      data: {
        fundId: fund.id,
        title,
        amount: new Prisma.Decimal(amount.toFixed(2)),
        category: category ?? "OTHER",
        date: date ? new Date(date) : new Date(),
        notes: notes ?? null,
      },
    });

    return NextResponse.json(
      {
        id: expense.id,
        title: expense.title,
        amount: expense.amount.toNumber(),
        category: expense.category,
        date: expense.date.toISOString(),
        notes: expense.notes,
        expenseId: expense.expenseId,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, { route: "/api/fund/expenses", method: "POST" });
  }
}
