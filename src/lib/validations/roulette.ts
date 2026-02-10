import { z } from "zod";

export const spinRouletteSchema = z.object({
  taskId: z.string().min(1, "Task ID es requerido"),
});

export const rouletteAssignSchema = z.object({
  memberId: z.string().min(1, "Member ID es requerido"),
  taskId: z.string().min(1).optional(),
  customTaskName: z.string().min(2).max(100).optional(),
}).refine(
  (data) => Boolean(data.taskId) !== Boolean(data.customTaskName),
  { message: "Debe proveer taskId o customTaskName, pero no ambos" },
);

export type SpinRouletteInput = z.infer<typeof spinRouletteSchema>;
export type RouletteAssignInput = z.infer<typeof rouletteAssignSchema>;
