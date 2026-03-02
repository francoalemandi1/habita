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

export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;
export type SplitType = z.infer<typeof splitTypeSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type SerializedExpense = z.infer<typeof serializedExpenseSchema>;
export type ExpensesListResponse = z.infer<typeof expensesListResponseSchema>;
