import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

/** Shape of the old `@habita/contracts` HouseholdHealthScore, removed on HEAD. */
interface LegacyHouseholdHealthScore {
  score: number;
  components: {
    tasks: { score: number; total: number; completedThisWeek: number; overdueThisWeek: number };
    expenses: { score: number; total: number; daysSinceLastExpense: number };
    balance: { score: number; total: number; totalUnsettledARS: number };
  };
}

/**
 * Legacy compat stub — only reached by app builds from before the rebrand
 * that still call GET /api/household/health-score. The feature was removed
 * on HEAD; this stub keeps the dashboard health card on those old builds
 * from crashing. Safe to delete once the store listing points to a build
 * without this call.
 *
 * GET /api/household/health-score
 * Matches the neutral score the original algorithm produced for a
 * household with no assignments and no expenses: 40 (tasks, no data) +
 * 0 (expenses, none registered) + 30 (balance, nothing owed) = 70.
 */
export async function GET() {
  try {
    await requireMember();

    const response: LegacyHouseholdHealthScore = {
      score: 70,
      components: {
        tasks: { score: 40, total: 40, completedThisWeek: 0, overdueThisWeek: 0 },
        expenses: { score: 0, total: 30, daysSinceLastExpense: 0 },
        balance: { score: 30, total: 30, totalUnsettledARS: 0 },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: "/api/household/health-score", method: "GET" });
  }
}
