import { z } from "zod";

export const rouletteAssignInputSchema = z.object({
  memberId: z.string().min(1),
  taskId: z.string().optional(),
  customTaskName: z.string().optional(),
  customTaskWeight: z.number().int().min(1).max(5).optional(),
  customTaskFrequency: z.string().optional(),
  customTaskEstimatedMinutes: z.number().int().optional(),
});

export const rouletteAssignResultSchema = z.object({
  assignment: z.object({
    id: z.string(),
    taskId: z.string(),
    memberId: z.string(),
    status: z.string(),
    dueDate: z.string(),
    task: z.object({
      id: z.string(),
      name: z.string(),
      weight: z.number(),
      frequency: z.string(),
    }),
    member: z.object({
      id: z.string(),
      name: z.string(),
      memberType: z.string(),
    }),
  }),
  taskName: z.string(),
});

export type RouletteAssignInput = z.infer<typeof rouletteAssignInputSchema>;
export type RouletteAssignResult = z.infer<typeof rouletteAssignResultSchema>;
