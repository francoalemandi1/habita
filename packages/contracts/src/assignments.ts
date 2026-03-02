import { z } from "zod";

export const assignmentStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "VERIFIED",
  "OVERDUE",
  "CANCELLED",
]);

export const assignmentTaskSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  weight: z.number(),
  frequency: z.string(),
  estimatedMinutes: z.number().nullable().optional(),
});

export const assignmentSummarySchema = z.object({
  id: z.string(),
  taskId: z.string(),
  memberId: z.string(),
  householdId: z.string(),
  dueDate: z.string(),
  status: assignmentStatusSchema,
  notes: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  task: assignmentTaskSummarySchema,
});

export const myAssignmentsResponseSchema = z.object({
  assignments: z.array(assignmentSummarySchema),
  pending: z.array(assignmentSummarySchema),
  completed: z.array(assignmentSummarySchema),
  stats: z.object({
    total: z.number().int().nonnegative(),
    pendingCount: z.number().int().nonnegative(),
    completedCount: z.number().int().nonnegative(),
  }),
});

export const completeAssignmentResponseSchema = z.object({
  assignment: assignmentSummarySchema,
  planFinalized: z.boolean().optional(),
  finalizedPlanId: z.string().optional(),
  nextAssignment: z
    .object({
      id: z.string(),
      memberId: z.string(),
      dueDate: z.string(),
    })
    .optional(),
  warnings: z
    .object({
      nextAssignmentCreated: z.boolean(),
    })
    .optional(),
});

export const uncompleteAssignmentResponseSchema = z.object({
  success: z.boolean(),
  status: z.string(),
});

export type AssignmentStatus = z.infer<typeof assignmentStatusSchema>;
export type AssignmentSummary = z.infer<typeof assignmentSummarySchema>;
export type MyAssignmentsResponse = z.infer<typeof myAssignmentsResponseSchema>;
export type CompleteAssignmentResponse = z.infer<typeof completeAssignmentResponseSchema>;
export type UncompleteAssignmentResponse = z.infer<typeof uncompleteAssignmentResponseSchema>;
