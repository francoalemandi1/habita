import type { ExpenseCategory } from "@prisma/client";

// ============================================
// Serialized DB shapes (Decimal → number, Date → string)
// ============================================

export interface SerializedFundAllocation {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
}

export interface SerializedFundContribution {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  period: string;
  notes: string | null;
  createdAt: string;
}

export interface SerializedFundExpense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  notes: string | null;
  expenseId: string | null;
}

// ============================================
// Aggregated state returned by GET /api/fund
// ============================================

export interface MemberContributionStatus {
  memberId: string;
  memberName: string;
  allocation: number;     // cuota mensual configurada
  contributed: number;    // aportado en el período actual
  pending: number;        // allocation - contributed (0 if paid in full)
}

export interface FundState {
  id: string;
  name: string;
  currency: string;
  monthlyTarget: number | null;
  fundCategories: ExpenseCategory[];
  isActive: boolean;

  // Calculated saldo: SUM(contributions) - SUM(fundExpenses)
  balance: number;
  totalContributedAllTime: number;
  totalSpentAllTime: number;

  // Current period summary
  currentPeriod: string;           // "2026-03"
  contributedThisPeriod: number;
  spentThisPeriod: number;

  memberStatuses: MemberContributionStatus[];
  recentExpenses: SerializedFundExpense[];  // last 10
  recentContributions: SerializedFundContribution[];  // last 10
}

// ============================================
// API request payloads
// ============================================

export interface CreateFundPayload {
  name?: string;
  monthlyTarget?: number | null;
  fundCategories?: ExpenseCategory[];
  allocations?: Array<{ memberId: string; amount: number }>;
}

export interface UpdateAllocationsPayload {
  allocations: Array<{ memberId: string; amount: number }>;
}

export interface CreateContributionPayload {
  amount: number;
  period?: string;  // defaults to current month
  notes?: string;
}

export interface CreateFundExpensePayload {
  title: string;
  amount: number;
  category?: ExpenseCategory;
  date?: string;
  notes?: string;
}
