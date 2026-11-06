import { z } from "zod";

import { expenseCategorySchema } from "./expenses";
import { taskFrequencySchema } from "./tasks";

export const parseEntryInputSchema = z.object({
  text: z.string().min(3).max(200),
});

const parsedExpenseSchema = z.object({
  title: z.string(),
  amount: z.number(),
  currency: z.string(),
  category: expenseCategorySchema,
  paidByName: z.string().nullable(),
  paidByMemberId: z.string().nullable(),
  splitWithNames: z.array(z.string()),
  splitWithMemberIds: z.array(z.string()),
  date: z.string().nullable(),
  notes: z.string().nullable(),
});

const parsedTaskSchema = z.object({
  name: z.string(),
  frequency: taskFrequencySchema,
  dueDate: z.string().nullable(),
  assigneeName: z.string().nullable(),
  assigneeMemberId: z.string().nullable(),
  estimatedMinutes: z.number().nullable(),
});

const parsedItemSchema = z.object({
  name: z.string(),
  quantity: z.number().int().min(1).max(99),
});

export const parseEntryResponseSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("expense"), expense: parsedExpenseSchema }),
  z.object({ kind: z.literal("task"), task: parsedTaskSchema }),
  z.object({ kind: z.literal("item"), items: z.array(parsedItemSchema).min(1).max(20) }),
  z.object({ kind: z.literal("unknown") }),
]);

export type ParseEntryInput = z.infer<typeof parseEntryInputSchema>;
export type ParsedExpenseEntry = z.infer<typeof parsedExpenseSchema>;
export type ParsedTaskEntry = z.infer<typeof parsedTaskSchema>;
export type ParsedItemEntry = z.infer<typeof parsedItemSchema>;
export type ParseEntryResponse = z.infer<typeof parseEntryResponseSchema>;
