import { NextResponse } from "next/server";
import { processRotations } from "@/lib/rotation-generator";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

/**
 * POST /api/rotations/process
 * Process all due rotations and generate assignments.
 * This endpoint can be called by a cron job.
 *
 * For security in production, add API key validation.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rotationResult = await processRotations();

    return NextResponse.json({
      success: true,
      rotations: {
        processed: rotationResult.processed,
        generated: rotationResult.generated,
        errors: rotationResult.errors,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/rotations/process", method: "POST" });
  }
}

/**
 * GET /api/rotations/process
 * Get status of rotation processing (for monitoring).
 */
export async function GET() {
  return NextResponse.json({
    status: "ready",
    endpoint: "POST /api/rotations/process",
    description: "Processes due rotations and generates assignments",
  });
}
