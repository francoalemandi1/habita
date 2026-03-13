import { z } from "zod";

export const healthScoreComponentTasksSchema = z.object({
  score: z.number().min(0).max(40),
  total: z.literal(40),
  completedThisWeek: z.number().int().min(0),
  overdueThisWeek: z.number().int().min(0),
});

export const healthScoreComponentExpensesSchema = z.object({
  score: z.number().min(0).max(30),
  total: z.literal(30),
  daysSinceLastExpense: z.number().int().min(0),
});

export const healthScoreComponentBalanceSchema = z.object({
  score: z.number().min(0).max(30),
  total: z.literal(30),
  totalUnsettledARS: z.number().min(0),
});

export const householdHealthScoreResponseSchema = z.object({
  score: z.number().min(0).max(100),
  components: z.object({
    tasks: healthScoreComponentTasksSchema,
    expenses: healthScoreComponentExpensesSchema,
    balance: healthScoreComponentBalanceSchema,
  }),
});

export type HouseholdHealthScore = z.infer<typeof householdHealthScoreResponseSchema>;
export type HealthScoreComponentTasks = z.infer<typeof healthScoreComponentTasksSchema>;
export type HealthScoreComponentExpenses = z.infer<typeof healthScoreComponentExpensesSchema>;
export type HealthScoreComponentBalance = z.infer<typeof healthScoreComponentBalanceSchema>;
