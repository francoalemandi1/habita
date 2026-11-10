import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { loadExpenseInsights } from "@/lib/expense-insights-loader";

/**
 * GET /api/expenses/insights
 * Aggregated financial insights for the current household.
 * Queries up to 4 months of history for 3-month average computation.
 * No cache — data changes with every expense mutation.
 */
export async function GET() {
  try {
    const member = await requireMember();
    const householdId = member.householdId;

    const insights = await loadExpenseInsights(householdId);

    return NextResponse.json(insights);
  } catch (error) {
    return handleApiError(error, {
      route: "/api/expenses/insights",
      method: "GET",
    });
  }
}
