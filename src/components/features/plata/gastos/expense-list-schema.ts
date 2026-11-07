import { z } from "zod";

/** Mirrors the subset of `GET /api/expenses` rows the Gastos list renders. */
export const expenseListRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  amount: z.number(),
  date: z.string(),
  category: z.enum([
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
  ]),
  paidBy: z.object({ id: z.string(), name: z.string() }),
  splits: z.array(z.object({ memberId: z.string() })),
});

export const expenseListResponseSchema = z.object({
  expenses: z.array(expenseListRowSchema),
  pagination: z.object({ hasMore: z.boolean() }),
});

export type ExpenseListRow = z.infer<typeof expenseListRowSchema>;
