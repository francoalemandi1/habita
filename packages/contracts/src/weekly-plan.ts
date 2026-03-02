import { z } from "zod";

export const planAssignmentSchema = z.object({
  taskName: z.string(),
  memberId: z.string(),
  memberName: z.string(),
  memberType: z.string(),
  reason: z.string(),
  dayOfWeek: z.number().int().min(1).max(7).optional(),
});

export const planPreviewResponseSchema = z.object({
  plan: z.object({
    id: z.string(),
    assignments: z.array(planAssignmentSchema),
    balanceScore: z.number(),
    notes: z.array(z.string()),
    durationDays: z.number().int().positive(),
    startDate: z.string(),
    endDate: z.string(),
    excludedTasks: z.array(z.record(z.unknown())),
  }),
  members: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      currentPending: z.number().int().nonnegative(),
      assignedInPlan: z.number().int().nonnegative(),
    }),
  ),
  fairnessDetails: z.object({
    adultDistribution: z.record(z.number().int().nonnegative()),
    isSymmetric: z.boolean(),
    maxDifference: z.number().int().nonnegative(),
  }),
});

export const applyPlanResponseSchema = z.object({
  success: z.boolean(),
  assignmentsCreated: z.number().int().nonnegative(),
  assignmentsCancelled: z.number().int().nonnegative().optional(),
  skipped: z.array(z.string()).optional(),
});

export type PlanAssignment = z.infer<typeof planAssignmentSchema>;
export type PlanPreviewResponse = z.infer<typeof planPreviewResponseSchema>;
export type ApplyPlanResponse = z.infer<typeof applyPlanResponseSchema>;
