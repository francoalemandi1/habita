import { Prisma } from "@prisma/client";
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

interface BuildJobLockKeyParams {
  householdId: string;
  jobType: AiJobType;
  memberId?: string;
}

/** Builds the unique scope key held by a RUNNING job while it is in flight. */
export function buildJobLockKey({ householdId, jobType, memberId }: BuildJobLockKeyParams): string {
  return isMemberScopedJobType(jobType) && memberId
    ? `${householdId}:${jobType}:${memberId}`
    : `${householdId}:${jobType}`;
}

// ============================================
// Functions
// ============================================

/** Pure check: has a RUNNING job been running longer than the stale threshold? */
export function isJobStale(startedAt: Date, now: Date, thresholdMs: number): boolean {
  return now.getTime() - startedAt.getTime() > thresholdMs;
}

interface TryStartJobParams {
  householdId: string;
  memberId: string;
  jobType: AiJobType;
  inputData?: unknown;
}

export type TryStartJobResult =
  | { started: true; jobId: string }
  | { started: false; existingJobId: string; startedAt: Date };

/**
 * Atomically starts a job for this scope key, relying on the `lockKey` unique
 * constraint to reject a concurrent second start instead of racing a
 * find-then-create check.
 */
export async function tryStartJob({
  householdId,
  memberId,
  jobType,
  inputData,
}: TryStartJobParams): Promise<TryStartJobResult> {
  const lockKey = buildJobLockKey({ householdId, jobType, memberId });
  const cutoff = new Date(Date.now() - STALE_JOB_TIMEOUT_MS);

  // Release stale RUNNING locks first so a timed-out job never blocks a new start.
  await prisma.aiJobLog.updateMany({
    where: { status: "RUNNING", lockKey, startedAt: { lt: cutoff } },
    data: {
      status: "FAILED",
      errorMessage: "timeout",
      completedAt: new Date(),
      lockKey: null,
    },
  });

  try {
    const job = await prisma.aiJobLog.create({
      data: {
        householdId,
        memberId,
        jobType,
        status: "RUNNING",
        inputData: inputData != null ? (inputData as object) : undefined,
        lockKey,
      },
    });
    return { started: true, jobId: job.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.aiJobLog.findFirst({
        where: { lockKey },
        select: { id: true, startedAt: true },
      });
      if (existing) {
        return { started: false, existingJobId: existing.id, startedAt: existing.startedAt };
      }
    }
    throw error;
  }
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
      lockKey: null,
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
      data: { status: "FAILED", errorMessage: "timeout", completedAt, lockKey: null },
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
