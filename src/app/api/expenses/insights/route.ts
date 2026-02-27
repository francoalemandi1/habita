import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { computeExpenseInsights, aggregateHistoricalMonth } from "@/lib/expense-insights";

import type { ExpenseRow, LastMonthExpenseRow, ActiveServiceRow, HistoricalExpenseRow } from "@/lib/expense-insights";

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

    const now = new Date();

    // Month boundaries
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);
    const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
    const twoMonthsAgoEnd = new Date(lastMonthStart.getTime() - 1);
    const threeMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0, 0);
    const threeMonthsAgoEnd = new Date(twoMonthsAgoStart.getTime() - 1);

    const daysElapsedThisMonth = now.getDate();
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const lastMonthTotalDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const twoMonthsAgoTotalDays = new Date(now.getFullYear(), now.getMonth() - 1, 0).getDate();
    const threeMonthsAgoTotalDays = new Date(now.getFullYear(), now.getMonth() - 2, 0).getDate();

    // Upcoming services window (next 7 days)
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);

    // Historical month select shape (no splits, no date needed)
    const historicalSelect = {
      amount: true,
      category: true,
      title: true,
      invoice: { select: { id: true } },
    } as const;

    // Parallel queries
    const [
      thisMonthExpenses,
      lastMonthExpenses,
      twoMonthsAgoExpenses,
      threeMonthsAgoExpenses,
      activeServicesRaw,
      upcomingServices,
    ] = await Promise.all([
      // 1. This month expenses WITH invoice link detection
      prisma.expense.findMany({
        where: {
          householdId,
          date: { gte: thisMonthStart, lte: now },
        },
        select: {
          amount: true,
          category: true,
          title: true,
          date: true,
          invoice: { select: { id: true } },
        },
        take: 500,
        orderBy: { date: "desc" },
      }),

      // 2. Last month expenses (for category growth comparison)
      prisma.expense.findMany({
        where: {
          householdId,
          date: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        select: {
          amount: true,
          category: true,
          title: true,
          date: true,
          invoice: { select: { id: true } },
        },
        take: 500,
        orderBy: { date: "desc" },
      }),

      // 3. Two months ago (for 3-month average)
      prisma.expense.findMany({
        where: {
          householdId,
          date: { gte: twoMonthsAgoStart, lte: twoMonthsAgoEnd },
        },
        select: historicalSelect,
        take: 500,
      }),

      // 4. Three months ago (for 3-month average)
      prisma.expense.findMany({
        where: {
          householdId,
          date: { gte: threeMonthsAgoStart, lte: threeMonthsAgoEnd },
        },
        select: historicalSelect,
        take: 500,
      }),

      // 5. All active services (for expected fixed cost)
      prisma.service.findMany({
        where: { householdId, isActive: true },
        select: { lastAmount: true, frequency: true },
      }),

      // 6. Active services due in next 7 days
      prisma.service.findMany({
        where: {
          householdId,
          isActive: true,
          nextDueDate: { gte: now, lte: sevenDaysFromNow },
        },
        select: { lastAmount: true },
      }),
    ]);

    // Serialize Decimal → number for this month
    const monthExpenseRows: ExpenseRow[] = thisMonthExpenses.map((e) => ({
      amount: e.amount.toNumber(),
      category: e.category,
      title: e.title,
      date: e.date.toISOString(),
      hasInvoice: e.invoice !== null,
    }));

    // Serialize last month
    const lastMonthRows: LastMonthExpenseRow[] = lastMonthExpenses.map((e) => ({
      amount: e.amount.toNumber(),
      category: e.category,
      title: e.title,
      date: e.date.toISOString(),
      hasInvoice: e.invoice !== null,
    }));

    // Aggregate historical months into summaries
    const serializeHistorical = (
      expenses: typeof twoMonthsAgoExpenses,
    ): HistoricalExpenseRow[] =>
      expenses.map((e) => ({
        amount: e.amount.toNumber(),
        category: e.category,
        title: e.title,
        hasInvoice: e.invoice !== null,
      }));

    const twoMonthsAgoSummary = twoMonthsAgoExpenses.length > 0
      ? aggregateHistoricalMonth(serializeHistorical(twoMonthsAgoExpenses), twoMonthsAgoTotalDays)
      : null;

    const threeMonthsAgoSummary = threeMonthsAgoExpenses.length > 0
      ? aggregateHistoricalMonth(serializeHistorical(threeMonthsAgoExpenses), threeMonthsAgoTotalDays)
      : null;

    // Serialize active services
    const activeServiceRows: ActiveServiceRow[] = activeServicesRaw.map((s) => ({
      lastAmount: s.lastAmount?.toNumber() ?? null,
      frequency: s.frequency,
    }));

    const serializedUpcoming = upcomingServices.map((s) => ({
      lastAmount: s.lastAmount?.toNumber() ?? null,
    }));

    const insights = computeExpenseInsights({
      thisMonthExpenses: monthExpenseRows,
      lastMonthExpenses: lastMonthRows,
      activeServices: activeServiceRows,
      upcomingServices: serializedUpcoming,
      daysElapsedThisMonth,
      totalDaysInMonth,
      lastMonthTotalDays,
      twoMonthsAgoSummary,
      threeMonthsAgoSummary,
    });

    return NextResponse.json(insights);
  } catch (error) {
    return handleApiError(error, {
      route: "/api/expenses/insights",
      method: "GET",
    });
  }
}
