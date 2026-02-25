import { z } from "zod";

const expenseCategoryEnum = z.enum([
  "GROCERIES", "UTILITIES", "RENT", "FOOD", "TRANSPORT",
  "HEALTH", "ENTERTAINMENT", "EDUCATION", "HOME", "OTHER",
]);

const splitTypeEnum = z.enum(["EQUAL", "CUSTOM", "PERCENTAGE"]);

const frequencyEnum = z.enum(["WEEKLY", "MONTHLY", "BIMONTHLY", "QUARTERLY", "YEARLY"]);

export const createServiceSchema = z.object({
  title: z.string().min(1).max(100),
  provider: z.string().max(100).nullable().optional(),
  accountNumber: z.string().max(100).nullable().optional(),
  lastAmount: z.number().positive().max(99_999_999).nullable().optional(),
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

export const updateServiceSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  provider: z.string().max(100).nullable().optional(),
  accountNumber: z.string().max(100).nullable().optional(),
  lastAmount: z.number().positive().max(99_999_999).nullable().optional(),
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

export const createInvoiceSchema = z.object({
  amount: z.number().positive().max(99_999_999),
  dueDate: z.string().datetime(),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Formato esperado: YYYY-MM"),
  notes: z.string().max(500).nullable().optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
