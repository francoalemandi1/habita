import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { loadExpenseDetail } from "@/lib/expense-detail-loader";

import type { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{ expenseId: string }>;
}

/**
 * GET /api/expenses/[expenseId]/detail
 * Expense + splits + canEdit + hasLaterSettlement for the desktop detail panel.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { expenseId } = await context.params;

    const detail = await loadExpenseDetail({
      householdId: member.householdId,
      expenseId,
      currentMemberId: member.id,
      memberType: member.memberType,
    });

    if (!detail) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses/[expenseId]/detail", method: "GET" });
  }
}
