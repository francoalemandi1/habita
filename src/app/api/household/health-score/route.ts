import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import type { HouseholdHealthScore } from "@habita/contracts";

/**
 * GET /api/household/health-score
 * Computes a 0-100 household health score from 3 components:
 *   - Tasks (40 pts): assignment completion rate last 7 days
 *   - Expenses (30 pts): recency of expense registration
 *   - Balance (30 pts): unsettled debt vs monthly spending
 */
export async function GET() {
  try {
    const member = await requireMember();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [recentAssignments, lastExpense, unsettledSplits, monthlyExpenses] = await Promise.all([
      // Tasks: assignments from last 7 days (completed or overdue)
      prisma.assignment.findMany({
        where: {
          householdId: member.householdId,
          dueDate: { gte: sevenDaysAgo, lte: now },
          status: { in: ["COMPLETED", "VERIFIED", "PENDING", "OVERDUE"] },
        },
        select: { status: true },
      }),
      // Expenses: most recent expense
      prisma.expense.findFirst({
        where: { householdId: member.householdId },
        orderBy: { date: "desc" },
        select: { date: true },
      }),
      // Balance: sum of unsettled splits in household
      prisma.expenseSplit.aggregate({
        where: {
          settled: false,
          expense: { householdId: member.householdId },
        },
        _sum: { amount: true },
      }),
      // Monthly spend (for balance ratio context)
      prisma.expense.aggregate({
        where: {
          householdId: member.householdId,
          date: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    // ── Component 1: Tasks (40 pts) ──────────────────────────────────────────
    const completed = recentAssignments.filter(
      (a) => a.status === "COMPLETED" || a.status === "VERIFIED",
    ).length;
    const overdue = recentAssignments.filter((a) => a.status === "OVERDUE").length;
    const total = recentAssignments.length;

    let tasksScore: number;
    if (total === 0) {
      tasksScore = 40; // no assignments = neutral (household may just not use tasks)
    } else {
      tasksScore = Math.round((completed / (completed + overdue || 1)) * 40);
    }

    // ── Component 2: Expenses (30 pts) ───────────────────────────────────────
    let daysSinceLastExpense = 999;
    if (lastExpense) {
      daysSinceLastExpense = Math.floor(
        (now.getTime() - lastExpense.date.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    let expensesScore: number;
    if (daysSinceLastExpense < 3) expensesScore = 30;
    else if (daysSinceLastExpense < 7) expensesScore = 20;
    else if (daysSinceLastExpense < 14) expensesScore = 10;
    else expensesScore = 0;

    // ── Component 3: Balance (30 pts) ────────────────────────────────────────
    const totalUnsettledARS = unsettledSplits._sum.amount?.toNumber() ?? 0;
    const monthlyTotal = monthlyExpenses._sum.amount?.toNumber() ?? 0;

    let balanceScore: number;
    if (monthlyTotal === 0) {
      balanceScore = 30; // no expenses yet = neutral
    } else {
      const debtRatio = totalUnsettledARS / monthlyTotal;
      if (debtRatio < 0.2) balanceScore = 30;
      else if (debtRatio < 0.4) balanceScore = 20;
      else if (debtRatio < 0.6) balanceScore = 10;
      else balanceScore = 0;
    }

    const score = tasksScore + expensesScore + balanceScore;

    const result: HouseholdHealthScore = {
      score,
      components: {
        tasks: {
          score: tasksScore,
          total: 40,
          completedThisWeek: completed,
          overdueThisWeek: overdue,
        },
        expenses: {
          score: expensesScore,
          total: 30,
          daysSinceLastExpense: daysSinceLastExpense === 999 ? 0 : daysSinceLastExpense,
        },
        balance: {
          score: balanceScore,
          total: 30,
          totalUnsettledARS,
        },
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: "/api/household/health-score", method: "GET" });
  }
}
