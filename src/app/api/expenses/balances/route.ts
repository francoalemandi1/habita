import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { getHouseholdBalances } from "@/lib/expense-balances";
import { handleApiError } from "@/lib/api-response";

/**
 * GET /api/expenses/balances
 * Compute who owes whom in the household, per currency.
 * Top-level `balances`/`transactions` mirror the primary currency for
 * backward compatibility with older app builds.
 */
export async function GET() {
  try {
    const member = await requireMember();
    const { byCurrency, primaryCurrency } = await getHouseholdBalances(member.householdId);
    const primary = byCurrency[primaryCurrency] ?? { balances: [], transactions: [] };

    return NextResponse.json({
      balances: primary.balances,
      transactions: primary.transactions,
      byCurrency,
      primaryCurrency,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/expenses/balances", method: "GET" });
  }
}
