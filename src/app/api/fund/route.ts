import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

import type { FundState, MemberContributionStatus, SerializedFundExpense, SerializedFundContribution } from "@/types/fund";
import type { ExpenseCategory } from "@prisma/client";

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * GET /api/fund
 * Returns the full fund state for the current household.
 */
export async function GET() {
  try {
    const member = await requireMember();

    const fund = await prisma.sharedFund.findUnique({
      where: { householdId: member.householdId },
      include: {
        memberAllocations: {
          include: { member: { select: { id: true, name: true } } },
        },
      },
    });

    if (!fund) {
      return NextResponse.json(null);
    }

    const currentPeriod = getCurrentPeriod();

    // Aggregate totals + fetch recent items in parallel (avoid loading ALL records)
    const [
      contributionTotals,
      expenseTotals,
      contributionThisPeriodAgg,
      periodContributions,
      recentExpensesRaw,
      recentContributionsRaw,
    ] = await Promise.all([
      prisma.fundContribution.aggregate({
        where: { fundId: fund.id },
        _sum: { amount: true },
      }),
      prisma.fundExpense.aggregate({
        where: { fundId: fund.id },
        _sum: { amount: true },
      }),
      prisma.fundContribution.aggregate({
        where: { fundId: fund.id, period: currentPeriod },
        _sum: { amount: true },
      }),
      // Per-member contributions for current period (needed for member statuses)
      prisma.fundContribution.groupBy({
        by: ["memberId"],
        where: { fundId: fund.id, period: currentPeriod },
        _sum: { amount: true },
      }),
      prisma.fundExpense.findMany({
        where: { fundId: fund.id },
        orderBy: { date: "desc" },
        take: 10,
      }),
      prisma.fundContribution.findMany({
        where: { fundId: fund.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { member: { select: { id: true, name: true } } },
      }),
    ]);

    const totalContributedAllTime = contributionTotals._sum.amount?.toNumber() ?? 0;
    const totalSpentAllTime = expenseTotals._sum.amount?.toNumber() ?? 0;
    const balance = totalContributedAllTime - totalSpentAllTime;
    const contributedThisPeriod = contributionThisPeriodAgg._sum.amount?.toNumber() ?? 0;

    // Compute spentThisPeriod: filter recent expenses by current period date
    // Use a targeted query instead of loading all expenses
    const periodStart = new Date(`${currentPeriod}-01T00:00:00.000Z`);
    const nextMonth = new Date(periodStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const spentThisPeriodAgg = await prisma.fundExpense.aggregate({
      where: {
        fundId: fund.id,
        date: { gte: periodStart, lt: nextMonth },
      },
      _sum: { amount: true },
    });
    const spentThisPeriod = spentThisPeriodAgg._sum.amount?.toNumber() ?? 0;

    // Build per-member contribution status for the current period
    const contributionsByMember = new Map(
      periodContributions.map((g) => [g.memberId, g._sum.amount?.toNumber() ?? 0]),
    );
    const memberStatuses: MemberContributionStatus[] = fund.memberAllocations.map((alloc) => {
      const contributed = contributionsByMember.get(alloc.memberId) ?? 0;
      const allocation = alloc.amount.toNumber();
      return {
        memberId: alloc.memberId,
        memberName: alloc.member.name,
        allocation,
        contributed,
        pending: Math.max(0, allocation - contributed),
      };
    });

    const recentExpenses: SerializedFundExpense[] = recentExpensesRaw.map((e) => ({
      id: e.id,
      title: e.title,
      amount: e.amount.toNumber(),
      category: e.category,
      date: e.date.toISOString(),
      notes: e.notes,
      expenseId: e.expenseId,
    }));

    const recentContributions: SerializedFundContribution[] = recentContributionsRaw.map((c) => ({
      id: c.id,
      memberId: c.memberId,
      memberName: c.member.name,
      amount: c.amount.toNumber(),
      period: c.period,
      notes: c.notes,
      createdAt: c.createdAt.toISOString(),
    }));

    const state: FundState = {
      id: fund.id,
      name: fund.name,
      currency: fund.currency,
      monthlyTarget: fund.monthlyTarget?.toNumber() ?? null,
      fundCategories: fund.fundCategories as ExpenseCategory[],
      isActive: fund.isActive,
      balance,
      totalContributedAllTime,
      totalSpentAllTime,
      currentPeriod,
      contributedThisPeriod,
      spentThisPeriod,
      memberStatuses,
      recentExpenses,
      recentContributions,
    };

    return NextResponse.json(state);
  } catch (error) {
    return handleApiError(error, { route: "/api/fund", method: "GET" });
  }
}
