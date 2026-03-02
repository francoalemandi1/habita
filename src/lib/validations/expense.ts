import { z } from "zod";
import { createExpenseSchema as createExpenseSchemaFromContracts } from "@habita/contracts";

export const createExpenseSchema = createExpenseSchemaFromContracts;

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
