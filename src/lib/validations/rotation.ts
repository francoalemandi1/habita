import { z } from "zod";

export const createRotationSchema = z.object({
  taskId: z.string().min(1, "Task ID requerido"),
  // Kept for older clients; the task's own frequency is the source of truth now.
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
  nextDueDate: z.string().datetime().optional(),
});

export const updateRotationSchema = z.object({
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
  isActive: z.boolean().optional(),
  nextDueDate: z.string().datetime().optional(),
});

export type CreateRotationInput = z.infer<typeof createRotationSchema>;
export type UpdateRotationInput = z.infer<typeof updateRotationSchema>;
