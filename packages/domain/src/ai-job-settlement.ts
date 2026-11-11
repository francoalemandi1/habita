export type JobStatus = "RUNNING" | "SUCCESS" | "FAILED";

export interface JobObservation {
  status: JobStatus | null;
  jobId: string | null;
}

export type JobSettlement = "completed" | "failed";

const SETTLEMENT_BY_STATUS: Record<Exclude<JobStatus, "RUNNING">, JobSettlement> = {
  SUCCESS: "completed",
  FAILED: "failed",
};

/**
 * Decides whether `current` is a job that just settled, comparing it with the previous
 * observation. A job that was seen running counts, and so does a new job id that is
 * already settled — the server can finish instantly (cached results) before any poll
 * sees it running. `previous === null` is the first observation: never fire for it.
 */
export function detectSettledJob(previous: JobObservation | null, current: JobObservation): JobSettlement | null {
  if (previous === null || current.status === null || current.status === "RUNNING") return null;
  const wasRunning = previous.status === "RUNNING";
  const isNewJob = current.jobId !== null && current.jobId !== previous.jobId;
  if (!wasRunning && !isNewJob) return null;
  return SETTLEMENT_BY_STATUS[current.status];
}
