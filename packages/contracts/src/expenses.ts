import { z } from "zod";

export const expenseCategorySchema = z.enum([
  "GROCERIES",
  "UTILITIES",
  "RENT",
  "FOOD",
  "TRANSPORT",
  "HEALTH",
  "ENTERTAINMENT",
  "EDUCATION",
  "HOME",
  "OTHER",
]);

export const splitTypeSchema = z.enum(["EQUAL", "CUSTOM", "PERCENTAGE"]);

export const createExpenseSchema = z.object({
  title: z.string().min(1).max(100),
  amount: z.number().positive().max(99_999_999),
  category: expenseCategorySchema.default("OTHER"),
  date: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  paidById: z.string().min(1),
  splitType: splitTypeSchema.default("EQUAL"),
  splits: z
    .array(
      z.object({
        memberId: z.string().min(1),
        amount: z.number().nonnegative().optional(),
        percentage: z.number().min(0).max(100).optional(),
      }),
    )
    .optional(),
  chargeToFund: z.boolean().optional(),
  // Same rule as settlements: no ":" so the key never collides with a prefix match elsewhere.
  idempotencyKey: z.string().min(8).max(100).regex(/^[^:]+$/).optional(),
});

export const updateExpenseSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  amount: z.number().positive().max(99_999_999).optional(),
  category: expenseCategorySchema.optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const serializedExpenseSchema = z.object({
  id: z.string(),
  title: z.string(),
  amount: z.number(),
  currency: z.string(),
  category: expenseCategorySchema,
  subcategory: z.string(),
  splitType: splitTypeSchema,
  date: z.string(),
  notes: z.string().nullable(),
  paidBy: z.object({
    id: z.string(),
    name: z.string(),
  }),
  splits: z.array(
    z.object({
      id: z.string(),
      memberId: z.string(),
      amount: z.number(),
      settled: z.boolean(),
      settledAt: z.string().nullable(),
      member: z.object({
        id: z.string(),
        name: z.string(),
      }),
    }),
  ),
});

export const expensesListResponseSchema = z.object({
  expenses: z.array(serializedExpenseSchema),
  pagination: z.object({
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  }),
});

export const memberBalanceSchema = z.object({
  memberId: z.string(),
  memberName: z.string(),
  balance: z.number(),
});

export const debtTransactionSchema = z.object({
  fromMemberId: z.string(),
  fromMemberName: z.string(),
  toMemberId: z.string(),
  toMemberName: z.string(),
  amount: z.number(),
});

export const currencyBalancesSchema = z.object({
  balances: z.array(memberBalanceSchema),
  transactions: z.array(debtTransactionSchema),
});

export const expenseBalancesResponseSchema = z.object({
  balances: z.array(memberBalanceSchema),
  transactions: z.array(debtTransactionSchema),
  byCurrency: z.record(z.string(), currencyBalancesSchema),
  primaryCurrency: z.string(),
});

export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;
export type SplitType = z.infer<typeof splitTypeSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type SerializedExpense = z.infer<typeof serializedExpenseSchema>;
export type ExpensesListResponse = z.infer<typeof expensesListResponseSchema>;
export type MemberBalance = z.infer<typeof memberBalanceSchema>;
export type DebtTransaction = z.infer<typeof debtTransactionSchema>;
export type ExpenseBalancesResponse = z.infer<typeof expenseBalancesResponseSchema>;
