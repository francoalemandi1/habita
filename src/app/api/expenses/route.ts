import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { createExpenseSchema } from "@/lib/validations/expense";
import { handleApiError } from "@/lib/api-response";
import { deliverNotificationToMembers } from "@/lib/push-delivery";
import { buildSplitsData } from "@/lib/expense-splits";
import { inferExpenseSubcategory } from "@/lib/expense-subcategory";
import { verifyCsrfOrigin } from "@/lib/csrf";

import { Prisma } from "@prisma/client";

import type { NextRequest } from "next/server";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * GET /api/expenses
 * List expenses for the current household with pagination.
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

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where: { householdId: member.householdId },
        include: {
          paidBy: { select: { id: true, name: true } },
          splits: {
            include: { member: { select: { id: true, name: true } } },
          },
        },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.expense.count({
        where: { householdId: member.householdId },
      }),
    ]);

    const serialized = expenses.map((e) => ({
      ...e,
      amount: e.amount.toNumber(),
      splits: e.splits.map((s) => ({ ...s, amount: s.amount.toNumber() })),
    }));

    return NextResponse.json({
      expenses: serialized,
      pagination: { total, limit, offset, hasMore: offset + expenses.length < total },
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses", method: "GET" });
  }
}

/**
 * POST /api/expenses
 * Create a new expense with splits.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfBlocked = verifyCsrfOrigin(request);
    if (csrfBlocked) return csrfBlocked;

    const member = await requireMember();
    const body = (await request.json()) as unknown;
    const validation = createExpenseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
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
        { error: "El miembro que pagó no pertenece al hogar" },
        { status: 400 },
      );
    }

    // Build splits
    const splitsResult = await buildSplitsData({
      householdId: member.householdId,
      amount: data.amount,
      splitType: data.splitType,
      splits: data.splits,
    });

    if (!splitsResult.ok) {
      return NextResponse.json({ error: splitsResult.error }, { status: 400 });
    }

    const splitsData = splitsResult.data;
    const subcategory = inferExpenseSubcategory(data.title, data.category);

    // When chargeToFund is requested, look up active fund and verify the category is in fundCategories
    let fundToCharge: { id: string } | null = null;
    if (data.chargeToFund) {
      const activeFund = await prisma.sharedFund.findUnique({
        where: { householdId: member.householdId },
        select: { id: true, isActive: true, fundCategories: true },
      });
      if (activeFund?.isActive && activeFund.fundCategories.includes(data.category)) {
        fundToCharge = { id: activeFund.id };
      }
    }

    const expense = await prisma.expense.create({
      data: {
        householdId: member.householdId,
        paidById: data.paidById,
        title: data.title,
        amount: new Prisma.Decimal(data.amount.toFixed(2)),
        currency: "ARS",
        category: data.category,
        subcategory,
        date: data.date ? new Date(data.date) : new Date(),
        notes: data.notes ?? null,
        splitType: data.splitType,
        splits: {
          create: splitsData,
        },
        // Link to fund expense if applicable
        ...(fundToCharge && {
          fundExpense: {
            create: {
              fundId: fundToCharge.id,
              title: data.title,
              amount: new Prisma.Decimal(data.amount.toFixed(2)),
              category: data.category,
              date: data.date ? new Date(data.date) : new Date(),
              notes: data.notes ?? null,
            },
          },
        }),
      },
      include: {
        paidBy: { select: { id: true, name: true } },
        splits: {
          include: { member: { select: { id: true, name: true } } },
        },
      },
    });

    // Notify split members (excluding the payer)
    const splitMemberIds = expense.splits
      .map((s) => s.member.id)
      .filter((id) => id !== data.paidById);

    if (splitMemberIds.length > 0) {
      const household = await prisma.household.findUnique({
        where: { id: member.householdId },
        select: { timezone: true },
      });

      void deliverNotificationToMembers({
        memberIds: splitMemberIds,
        type: "EXPENSE_SHARED",
        title: "Nuevo gasto compartido",
        message: `${expense.paidBy.name} registró "${data.title}" por $${data.amount.toLocaleString("es-AR")}`,
        actionUrl: "/expenses",
        metadata: { expenseId: expense.id },
        householdTimezone: household?.timezone,
      });
    }

    return NextResponse.json({
      ...expense,
      amount: expense.amount.toNumber(),
      splits: expense.splits.map((s) => ({ ...s, amount: s.amount.toNumber() })),
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses", method: "POST" });
  }
}
