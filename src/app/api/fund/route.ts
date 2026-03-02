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
        contributions: {
          orderBy: { createdAt: "desc" },
          include: { member: { select: { id: true, name: true } } },
        },
        expenses: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!fund) {
      return NextResponse.json(null);
    }

    const currentPeriod = getCurrentPeriod();

    // Saldo calculado: SUM(contributions) - SUM(fundExpenses)
    const totalContributedAllTime = fund.contributions.reduce(
      (sum, c) => sum + c.amount.toNumber(),
      0,
    );
    const totalSpentAllTime = fund.expenses.reduce(
      (sum, e) => sum + e.amount.toNumber(),
      0,
    );
    const balance = totalContributedAllTime - totalSpentAllTime;

    const contributedThisPeriod = fund.contributions
      .filter((c) => c.period === currentPeriod)
      .reduce((sum, c) => sum + c.amount.toNumber(), 0);

    const spentThisPeriod = fund.expenses
      .filter((e) => {
        const d = e.date;
        const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return period === currentPeriod;
      })
      .reduce((sum, e) => sum + e.amount.toNumber(), 0);

    // Build per-member contribution status for the current period
    const memberStatuses: MemberContributionStatus[] = fund.memberAllocations.map((alloc) => {
      const contributed = fund.contributions
        .filter((c) => c.memberId === alloc.memberId && c.period === currentPeriod)
        .reduce((sum, c) => sum + c.amount.toNumber(), 0);
      const allocation = alloc.amount.toNumber();
      return {
        memberId: alloc.memberId,
        memberName: alloc.member.name,
        allocation,
        contributed,
        pending: Math.max(0, allocation - contributed),
      };
    });

    const recentExpenses: SerializedFundExpense[] = fund.expenses.slice(0, 10).map((e) => ({
      id: e.id,
      title: e.title,
      amount: e.amount.toNumber(),
      category: e.category,
      date: e.date.toISOString(),
      notes: e.notes,
      expenseId: e.expenseId,
    }));

    const recentContributions: SerializedFundContribution[] = fund.contributions
      .slice(0, 10)
      .map((c) => ({
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
