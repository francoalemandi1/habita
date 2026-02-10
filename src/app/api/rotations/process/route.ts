import { NextResponse } from "next/server";
import { processRotations, processDueReminders } from "@/lib/rotation-generator";

import type { NextRequest } from "next/server";

/**
 * POST /api/rotations/process
 * Process all due rotations and generate assignments.
 * This endpoint can be called by a cron job.
 *
 * For security in production, add API key validation.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Process rotations
    const rotationResult = await processRotations();

    // Process reminders
    const reminderResult = await processDueReminders();

    return NextResponse.json({
      success: true,
      rotations: {
        processed: rotationResult.processed,
        generated: rotationResult.generated,
        errors: rotationResult.errors,
      },
      reminders: {
        processed: reminderResult.processed,
        sent: reminderResult.reminders,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/rotations/process error:", error);
    return NextResponse.json(
      { error: "Error processing rotations" },
      { status: 500 }
    );
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
