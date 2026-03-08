import { z } from "zod";

// ============================================
// Enums (mirrors Prisma enums)
// ============================================

export const AI_JOB_TYPES = ["PREVIEW_PLAN", "COCINA", "SHOPPING_PLAN"] as const;
export type AiJobType = (typeof AI_JOB_TYPES)[number];

export const AI_JOB_STATUSES = ["RUNNING", "SUCCESS", "FAILED"] as const;
export type AiJobStatusValue = (typeof AI_JOB_STATUSES)[number];

// ============================================
// Schemas
// ============================================

export const aiJobStatusResponseSchema = z.object({
  status: z.enum(AI_JOB_STATUSES).nullable(),
  jobId: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  errorMessage: z.string().nullable(),
});

export type AiJobStatusResponse = z.infer<typeof aiJobStatusResponseSchema>;

export const aiJobTriggerResponseSchema = z.object({
  started: z.boolean(),
  alreadyRunning: z.boolean(),
  jobId: z.string().nullable(),
});

export type AiJobTriggerResponse = z.infer<typeof aiJobTriggerResponseSchema>;
