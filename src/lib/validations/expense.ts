import { z } from "zod";

export const createExpenseSchema = z.object({
  title: z.string().min(1).max(100),
  amount: z.number().positive().max(99_999_999),
  category: z
    .enum([
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
    ])
    .default("OTHER"),
  date: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  paidById: z.string().min(1),
  splitType: z.enum(["EQUAL", "CUSTOM", "PERCENTAGE"]).default("EQUAL"),
  splits: z
    .array(
      z.object({
        memberId: z.string().min(1),
        amount: z.number().nonnegative().optional(),
        percentage: z.number().min(0).max(100).optional(),
      }),
    )
    .optional(),
});

export const settleSchema = z.object({
  splitIds: z.array(z.string().min(1)).min(1),
});

export const updateExpenseSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  amount: z.number().positive().max(99_999_999).optional(),
  category: z
    .enum([
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
    ])
    .optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const settleBetweenSchema = z.object({
  fromMemberId: z.string().min(1),
  toMemberId: z.string().min(1),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type SettleInput = z.infer<typeof settleSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type SettleBetweenInput = z.infer<typeof settleBetweenSchema>;
