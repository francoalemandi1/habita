import { z } from "zod";
import { expenseCategorySchema } from "./expenses";

// ============================================
// Serialized DB shapes (Decimal → number, Date → string)
// ============================================

export const serializedFundContributionSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  memberName: z.string(),
  amount: z.number(),
  period: z.string(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

export const serializedFundExpenseSchema = z.object({
  id: z.string(),
  title: z.string(),
  amount: z.number(),
  category: z.string(),
  date: z.string(),
  notes: z.string().nullable(),
  expenseId: z.string().nullable(),
});

// ============================================
// Aggregated state returned by GET /api/fund
// ============================================

export const memberContributionStatusSchema = z.object({
  memberId: z.string(),
  memberName: z.string(),
  allocation: z.number(),
  contributed: z.number(),
  pending: z.number(),
});

export const fundStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: z.string(),
  monthlyTarget: z.number().nullable(),
  fundCategories: z.array(z.string()),
  isActive: z.boolean(),
  balance: z.number(),
  totalContributedAllTime: z.number(),
  totalSpentAllTime: z.number(),
  currentPeriod: z.string(),
  contributedThisPeriod: z.number(),
  spentThisPeriod: z.number(),
  memberStatuses: z.array(memberContributionStatusSchema),
  recentExpenses: z.array(serializedFundExpenseSchema),
  recentContributions: z.array(serializedFundContributionSchema),
});

// ============================================
// API request payloads
// ============================================

export const createFundPayloadSchema = z.object({
  name: z.string().optional(),
  monthlyTarget: z.number().nullable().optional(),
  fundCategories: z.array(z.string()).optional(),
  allocations: z
    .array(z.object({ memberId: z.string(), amount: z.number() }))
    .optional(),
});

export const updateAllocationsPayloadSchema = z.object({
  allocations: z.array(
    z.object({ memberId: z.string(), amount: z.number() }),
  ),
});

export const createContributionPayloadSchema = z.object({
  amount: z.number().positive(),
  period: z.string().optional(),
  notes: z.string().optional(),
});

export const createFundExpensePayloadSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
});

// ============================================
// Inferred types
// ============================================

export type MemberContributionStatus = z.infer<
  typeof memberContributionStatusSchema
>;
export type FundState = z.infer<typeof fundStateSchema>;
export type SerializedFundContribution = z.infer<
  typeof serializedFundContributionSchema
>;
export type SerializedFundExpense = z.infer<
  typeof serializedFundExpenseSchema
>;
export type CreateFundPayload = z.infer<typeof createFundPayloadSchema>;
export type UpdateAllocationsPayload = z.infer<
  typeof updateAllocationsPayloadSchema
>;
export type CreateContributionPayload = z.infer<
  typeof createContributionPayloadSchema
>;
export type CreateFundExpensePayload = z.infer<
  typeof createFundExpensePayloadSchema
>;
