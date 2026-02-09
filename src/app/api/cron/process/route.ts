import { NextResponse } from "next/server";
import { applyOverduePenalties } from "@/lib/penalties";
import { processAbsenceRedistribution } from "@/lib/absence-redistribution";
import { cleanupOldNotifications } from "@/lib/notification-service";

import type { NextRequest } from "next/server";

/**
 * POST /api/cron/process
 * Job programado: (1) penalidades por atraso, (2) redistribución por ausencias (spec §9.2).
 * Protegido por CRON_SECRET si está definido.
 */
export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
    }
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [penaltyResult, absenceResult, cleanupResult] = await Promise.all([
      applyOverduePenalties(),
      processAbsenceRedistribution(),
      cleanupOldNotifications(),
    ]);

    return NextResponse.json({
      success: true,
      penalties: {
        processed: penaltyResult.processed,
        penaltiesCreated: penaltyResult.penaltiesCreated,
        errors: penaltyResult.errors,
      },
      absences: {
        processedAbsences: absenceResult.processedAbsences,
        reassigned: absenceResult.reassigned,
        postponed: absenceResult.postponed,
        errors: absenceResult.errors,
      },
      notifications: {
        deletedRead: cleanupResult.deletedRead,
        deletedUnread: cleanupResult.deletedUnread,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/cron/process error:", error);
    return NextResponse.json(
      { error: "Error processing cron job" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/process
 * Estado del endpoint (monitoreo). Protegido por CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    status: "ready",
    endpoint: "POST /api/cron/process",
    description:
      "Aplica penalidades por atraso y redistribuye asignaciones por ausencias activas",
  });
}
