import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { getJobResult } from "@/lib/ai-jobs";
import { NotFoundError } from "@/lib/errors";

/**
 * GET /api/ai/job-result/:jobId
 * Returns the full job result (data isolated by householdId).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const member = await requireMember();
    const { jobId } = await params;

    const job = await getJobResult(jobId, member.householdId);
    if (!job) {
      throw new NotFoundError("Job no encontrado");
    }

    return NextResponse.json({
      jobType: job.jobType,
      status: job.status,
      resultData: job.resultData,
      weeklyPlanId: job.weeklyPlanId,
      errorMessage: job.errorMessage,
      durationMs: job.durationMs,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/job-result/[jobId]", method: "GET" });
  }
}
