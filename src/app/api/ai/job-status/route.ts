import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { getLatestJobStatus } from "@/lib/ai-jobs";
import { BadRequestError } from "@/lib/errors";

import type { NextRequest } from "next/server";
import type { AiJobType } from "@prisma/client";
import type { AiJobStatusResponse } from "@habita/contracts";

const VALID_TYPES = new Set<AiJobType>(["PREVIEW_PLAN", "COCINA", "SHOPPING_PLAN"]);

/**
 * GET /api/ai/job-status?type=PREVIEW_PLAN|COCINA|SHOPPING_PLAN
 * Returns the latest job status for the household.
 */
export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();

    const jobType = request.nextUrl.searchParams.get("type") as AiJobType | null;
    if (!jobType || !VALID_TYPES.has(jobType)) {
      throw new BadRequestError("Parámetro 'type' inválido");
    }

    const job = await getLatestJobStatus(member.householdId, jobType);

    const response: AiJobStatusResponse = {
      status: job?.status ?? null,
      jobId: job?.id ?? null,
      startedAt: job?.startedAt?.toISOString() ?? null,
      completedAt: job?.completedAt?.toISOString() ?? null,
      errorMessage: job?.errorMessage ?? null,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/job-status", method: "GET" });
  }
}
