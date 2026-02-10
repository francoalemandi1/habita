import { z } from "zod";

export const assignmentStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "VERIFIED",
  "OVERDUE",
  "CANCELLED",
]);

export const createAssignmentSchema = z.object({
  taskId: z.string().min(1, "Task ID es requerido"),
  memberId: z.string().min(1, "Member ID es requerido"),
  dueDate: z.coerce.date(),
  notes: z.string().max(500).optional(),
});

export const updateAssignmentSchema = z.object({
  status: z.enum(["IN_PROGRESS"]).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const completeAssignmentSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const autoAssignSchema = z.object({
  taskId: z.string().min(1, "Task ID es requerido"),
  dueDate: z.coerce.date(),
});

export type AssignmentStatus = z.infer<typeof assignmentStatusSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type CompleteAssignmentInput = z.infer<typeof completeAssignmentSchema>;
export type AutoAssignInput = z.infer<typeof autoAssignSchema>;
