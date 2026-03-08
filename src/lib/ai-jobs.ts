import { prisma } from "@/lib/prisma";
import type { AiJobType, AiJobStatus } from "@prisma/client";

// ============================================
// Constants
// ============================================

/** Jobs running longer than 5 minutes are considered stale. */
const STALE_JOB_TIMEOUT_MS = 5 * 60 * 1000;

/** Only return jobs from the last hour when checking status. */
const STATUS_WINDOW_MS = 60 * 60 * 1000;

// ============================================
// Types
// ============================================

interface CompleteJobParams {
  status: Extract<AiJobStatus, "SUCCESS" | "FAILED">;
  resultData?: unknown;
  weeklyPlanId?: string;
  errorMessage?: string;
  durationMs: number;
}

// ============================================
// Functions
// ============================================

/**
 * Find a currently running job of a given type for this household.
 * Marks stale RUNNING entries (>5min) as FAILED first.
 */
export async function findRunningJob(householdId: string, jobType: AiJobType) {
  const cutoff = new Date(Date.now() - STALE_JOB_TIMEOUT_MS);

  // Clean up stale RUNNING entries
  await prisma.aiJobLog.updateMany({
    where: {
      status: "RUNNING",
      householdId,
      jobType,
      startedAt: { lt: cutoff },
    },
    data: {
      status: "FAILED",
      errorMessage: "Job timed out (stale RUNNING entry)",
      completedAt: new Date(),
    },
  });

  return prisma.aiJobLog.findFirst({
    where: { status: "RUNNING", householdId, jobType, startedAt: { gte: cutoff } },
    orderBy: { startedAt: "desc" },
    select: { id: true, startedAt: true },
  });
}

/** Create a RUNNING job entry. Returns the job ID. */
export async function markJobRunning(
  householdId: string,
  memberId: string,
  jobType: AiJobType,
  inputData?: unknown,
): Promise<string> {
  const job = await prisma.aiJobLog.create({
    data: {
      householdId,
      memberId,
      jobType,
      status: "RUNNING",
      inputData: inputData != null ? (inputData as object) : undefined,
    },
  });
  return job.id;
}

/** Complete a RUNNING job with the final outcome. */
export async function completeJob(
  jobId: string,
  params: CompleteJobParams,
): Promise<void> {
  await prisma.aiJobLog.update({
    where: { id: jobId },
    data: {
      status: params.status,
      resultData: params.resultData != null ? (params.resultData as object) : undefined,
      weeklyPlanId: params.weeklyPlanId ?? undefined,
      errorMessage: params.errorMessage ?? null,
      durationMs: params.durationMs,
      completedAt: new Date(),
    },
  });
}

/** Get the latest job status for a household + job type (within the last hour). */
export async function getLatestJobStatus(householdId: string, jobType: AiJobType) {
  const since = new Date(Date.now() - STATUS_WINDOW_MS);

  return prisma.aiJobLog.findFirst({
    where: { householdId, jobType, startedAt: { gte: since } },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      errorMessage: true,
    },
  });
}

/** Get the full job result (with data isolation by householdId). */
export async function getJobResult(jobId: string, householdId: string) {
  return prisma.aiJobLog.findFirst({
    where: { id: jobId, householdId },
    select: {
      id: true,
      jobType: true,
      status: true,
      resultData: true,
      weeklyPlanId: true,
      errorMessage: true,
      durationMs: true,
      startedAt: true,
      completedAt: true,
    },
  });
}
