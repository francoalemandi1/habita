import { prisma } from "@/lib/prisma";
import { computeExpenseInsights, aggregateHistoricalMonth } from "@/lib/expense-insights";

import type {
  ActiveServiceRow,
  ExpenseInsightsResponse,
  ExpenseRow,
  HistoricalExpenseRow,
  LastMonthExpenseRow,
} from "@/lib/expense-insights";

interface DatedExpenseRecord {
  amount: { toNumber(): number };
  category: ExpenseRow["category"];
  subcategory: ExpenseRow["subcategory"];
  title: string;
  date: Date;
  invoice: { id: string } | null;
}

function toExpenseRow(expense: DatedExpenseRecord): ExpenseRow {
  return {
    amount: expense.amount.toNumber(),
    category: expense.category,
    subcategory: expense.subcategory,
    title: expense.title,
    date: expense.date.toISOString(),
    hasInvoice: expense.invoice !== null,
  };
}

/**
 * Loads and aggregates a household's expense insights (up to 6 months of history).
 * Shared by GET /api/expenses/insights and the Plata page, which server-renders the
 * Gastos hero so its month total ships in the HTML instead of after a client fetch.
 */
export async function loadExpenseInsights(householdId: string): Promise<ExpenseInsightsResponse> {
  const now = new Date();

  // Month boundaries
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);
  const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
  const twoMonthsAgoEnd = new Date(lastMonthStart.getTime() - 1);
  const threeMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0, 0);
  const threeMonthsAgoEnd = new Date(twoMonthsAgoStart.getTime() - 1);
  const sixMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

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
    subcategory: true,
    title: true,
    invoice: { select: { id: true } },
  } as const;
  const datedSelect = { ...historicalSelect, date: true } as const;

  // Parallel queries
  const [
    thisMonthExpenses,
    lastMonthExpenses,
    twoMonthsAgoExpenses,
    threeMonthsAgoExpenses,
    sixMonthsExpenses,
    activeServicesRaw,
    upcomingServices,
  ] = await Promise.all([
    // 1. This month expenses WITH invoice link detection
    prisma.expense.findMany({
      where: {
        householdId,
        date: { gte: thisMonthStart, lte: now },
      },
      select: datedSelect,
      take: 500,
      orderBy: { date: "desc" },
    }),

    // 2. Last month expenses (for category growth comparison)
    prisma.expense.findMany({
      where: {
        householdId,
        date: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      select: datedSelect,
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

    // 5. Six-month history for monthly chart/state resolution
    prisma.expense.findMany({
      where: {
        householdId,
        date: { gte: sixMonthsAgoStart, lte: now },
      },
      select: datedSelect,
      take: 2000,
      orderBy: { date: "desc" },
    }),

    // 6. All active services (for expected fixed cost)
    prisma.service.findMany({
      where: { householdId, isActive: true },
      select: { lastAmount: true, frequency: true },
    }),

    // 7. Active services due in next 7 days
    prisma.service.findMany({
      where: {
        householdId,
        isActive: true,
        nextDueDate: { gte: now, lte: sevenDaysFromNow },
      },
      select: { lastAmount: true },
    }),
  ]);

  // Serialize Decimal → number
  const monthExpenseRows: ExpenseRow[] = thisMonthExpenses.map(toExpenseRow);

  const lastMonthRows: LastMonthExpenseRow[] = lastMonthExpenses.map(toExpenseRow);

  const historicalRows: ExpenseRow[] = sixMonthsExpenses.map(toExpenseRow);

  // Aggregate historical months into summaries
  const serializeHistorical = (
    expenses: typeof twoMonthsAgoExpenses,
  ): HistoricalExpenseRow[] =>
    expenses.map((e) => ({
      amount: e.amount.toNumber(),
      category: e.category,
      subcategory: e.subcategory,
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

  return computeExpenseInsights({
    thisMonthExpenses: monthExpenseRows,
    lastMonthExpenses: lastMonthRows,
    historicalExpenses: historicalRows,
    activeServices: activeServiceRows,
    upcomingServices: serializedUpcoming,
    daysElapsedThisMonth,
    totalDaysInMonth,
    lastMonthTotalDays,
    twoMonthsAgoSummary,
    threeMonthsAgoSummary,
  });
}
