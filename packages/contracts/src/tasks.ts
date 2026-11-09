import { z } from "zod";

export const taskFrequencySchema = z.enum([
  "DAILY",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "ONCE",
]);

export const initialAssignmentSchema = z.object({
  memberId: z.string().min(1).nullable(),
  dueDate: z.string().datetime(),
});

export const createTaskInputSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  frequency: taskFrequencySchema.default("WEEKLY"),
  weight: z.number().int().min(1).max(5).default(1),
  minAge: z.number().int().min(0).max(100).nullable().optional(),
  estimatedMinutes: z.number().int().min(1).max(480).nullable().optional(),
  isRouletteEligible: z.boolean().optional().default(false),
  isRotating: z.boolean().optional(),
  // Same rule as settlements: no ":" so the key never collides with a prefix match elsewhere.
  idempotencyKey: z.string().min(8).max(100).regex(/^[^:]+$/).optional(),
  initialAssignment: initialAssignmentSchema.optional(),
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
  isRotating: z.boolean().optional(),
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
export type InitialAssignmentInput = z.infer<typeof initialAssignmentSchema>;
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type TaskSummary = z.infer<typeof taskSummarySchema>;
export type TasksListResponse = z.infer<typeof tasksListResponseSchema>;
