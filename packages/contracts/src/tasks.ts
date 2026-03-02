import { z } from "zod";

export const taskFrequencySchema = z.enum([
  "DAILY",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "ONCE",
]);

export const createTaskInputSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  frequency: taskFrequencySchema.default("WEEKLY"),
  weight: z.number().int().min(1).max(5).default(1),
  minAge: z.number().int().min(0).max(100).nullable().optional(),
  estimatedMinutes: z.number().int().min(1).max(480).nullable().optional(),
  isRouletteEligible: z.boolean().optional().default(false),
});

export const taskSummarySchema = z.object({
  id: z.string(),
  householdId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  frequency: taskFrequencySchema,
  weight: z.number().int(),
  minAge: z.number().int().nullable().optional(),
  estimatedMinutes: z.number().int().nullable().optional(),
  isRouletteEligible: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const tasksListResponseSchema = z.object({
  tasks: z.array(taskSummarySchema),
  pagination: z.object({
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  }),
});

export type TaskFrequency = z.infer<typeof taskFrequencySchema>;
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type TaskSummary = z.infer<typeof taskSummarySchema>;
export type TasksListResponse = z.infer<typeof tasksListResponseSchema>;
