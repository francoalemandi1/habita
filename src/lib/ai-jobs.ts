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

interface JobScopeOptions {
  /** Scope the lookup to a single member (SHOPPING_PLAN). Omit for household-wide jobs (PREVIEW_PLAN). */
  memberId?: string;
}

/** Job types owned by the member that started them; PREVIEW_PLAN is shared by the household. */
const MEMBER_SCOPED_JOB_TYPES: ReadonlySet<AiJobType> = new Set<AiJobType>(["SHOPPING_PLAN"]);

export function isMemberScopedJobType(jobType: AiJobType): boolean {
  return MEMBER_SCOPED_JOB_TYPES.has(jobType);
}

// ============================================
// Functions
// ============================================

/** Pure check: has a RUNNING job been running longer than the stale threshold? */
export function isJobStale(startedAt: Date, now: Date, thresholdMs: number): boolean {
  return now.getTime() - startedAt.getTime() > thresholdMs;
}

/**
 * Find a currently running job of a given type for this household.
 * Marks stale RUNNING entries (>5min) as FAILED first.
 * Pass `memberId` to scope per-member job types (SHOPPING_PLAN).
 */
export async function findRunningJob(
  householdId: string,
  jobType: AiJobType,
  options: JobScopeOptions = {},
) {
  const { memberId } = options;
  const cutoff = new Date(Date.now() - STALE_JOB_TIMEOUT_MS);

  // Clean up stale RUNNING entries
  await prisma.aiJobLog.updateMany({
    where: {
      status: "RUNNING",
      householdId,
      jobType,
      startedAt: { lt: cutoff },
      ...(memberId ? { memberId } : {}),
    },
    data: {
      status: "FAILED",
      errorMessage: "Job timed out (stale RUNNING entry)",
      completedAt: new Date(),
    },
  });

  return prisma.aiJobLog.findFirst({
    where: {
      status: "RUNNING",
      householdId,
      jobType,
      startedAt: { gte: cutoff },
      ...(memberId ? { memberId } : {}),
    },
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

/**
 * Find a recent successful job matching the given input fields.
 * Uses JSONB containment (`@>`) so partial matches work (e.g. match textInput + mealType
 * without needing to match imageCount).
 */
export async function findRecentSuccessfulJob(
  householdId: string,
  jobType: AiJobType,
  inputMatcher: Record<string, unknown>,
  maxAgeMs: number,
): Promise<{ id: string; resultData: unknown } | null> {
  const since = new Date(Date.now() - maxAgeMs);
  const matcherJson = JSON.stringify(inputMatcher);

  const rows = await prisma.$queryRaw<Array<{ id: string; resultData: unknown }>>`
    SELECT "id", "resultData"
    FROM "ai_job_logs"
    WHERE "householdId" = ${householdId}
      AND "jobType" = ${jobType}::"AiJobType"
      AND "status" = 'SUCCESS'::"AiJobStatus"
      AND "completedAt" >= ${since}
      AND "inputData" @> ${matcherJson}::jsonb
    ORDER BY "completedAt" DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

/**
 * Get the latest job status for a household + job type (within the last hour).
 * A RUNNING job older than the stale threshold is turned into FAILED ("timeout") so
 * clients stop polling it. Pass `memberId` to scope per-member job types (SHOPPING_PLAN).
 */
export async function getLatestJobStatus(
  householdId: string,
  jobType: AiJobType,
  options: JobScopeOptions = {},
) {
  const { memberId } = options;
  const since = new Date(Date.now() - STATUS_WINDOW_MS);

  const job = await prisma.aiJobLog.findFirst({
    where: { householdId, jobType, startedAt: { gte: since }, ...(memberId ? { memberId } : {}) },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      errorMessage: true,
    },
  });

  if (job && job.status === "RUNNING" && isJobStale(job.startedAt, new Date(), STALE_JOB_TIMEOUT_MS)) {
    const completedAt = new Date();
    await prisma.aiJobLog.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: "timeout", completedAt },
    });
    return { ...job, status: "FAILED" as AiJobStatus, errorMessage: "timeout", completedAt };
  }

  return job;
}

/** Get the full job result (with data isolation by householdId). Includes memberId for caller-side ownership checks on per-member job types. */
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
      memberId: true,
    },
  });
}
