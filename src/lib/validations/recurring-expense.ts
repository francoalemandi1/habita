import { z } from "zod";

const expenseCategoryEnum = z.enum([
  "GROCERIES", "UTILITIES", "RENT", "FOOD", "TRANSPORT",
  "HEALTH", "ENTERTAINMENT", "EDUCATION", "HOME", "OTHER",
]);

const splitTypeEnum = z.enum(["EQUAL", "CUSTOM", "PERCENTAGE"]);

const frequencyEnum = z.enum(["WEEKLY", "MONTHLY", "BIMONTHLY", "QUARTERLY", "YEARLY"]);

export const createRecurringExpenseSchema = z.object({
  title: z.string().min(1).max(100),
  amount: z.number().positive().max(99_999_999),
  category: expenseCategoryEnum.default("OTHER"),
  splitType: splitTypeEnum.default("EQUAL"),
  paidById: z.string().min(1),
  notes: z.string().max(500).nullable().optional(),
  frequency: frequencyEnum,
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  autoGenerate: z.boolean().default(false),
  nextDueDate: z.string().datetime(),
});

export const updateRecurringExpenseSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  amount: z.number().positive().max(99_999_999).optional(),
  category: expenseCategoryEnum.optional(),
  splitType: splitTypeEnum.optional(),
  paidById: z.string().min(1).optional(),
  notes: z.string().max(500).nullable().optional(),
  frequency: frequencyEnum.optional(),
  dayOfMonth: z.number().int().min(1).max(28).nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  autoGenerate: z.boolean().optional(),
  nextDueDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export type CreateRecurringExpenseInput = z.infer<typeof createRecurringExpenseSchema>;
export type UpdateRecurringExpenseInput = z.infer<typeof updateRecurringExpenseSchema>;
