import { NextResponse } from "next/server";
import { processAbsenceRedistribution } from "@/lib/absence-redistribution";
import { cleanupOldNotifications } from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";
import { sendPushToMember } from "@/lib/web-push";
import { sendWhatsAppMessage, isWhatsAppConfigured } from "@/lib/whatsapp";

import type { NextRequest } from "next/server";

/** Send push reminders to members with pending tasks due today. */
async function sendDailyPushReminders(): Promise<{ sent: number; errors: number }> {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  // Find members with pending assignments due today that have push subscriptions
  const membersWithPending = await prisma.member.findMany({
    where: {
      isActive: true,
      pushSubscriptions: { some: {} },
      assignments: {
        some: {
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueDate: { lte: endOfToday },
        },
      },
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          assignments: {
            where: {
              status: { in: ["PENDING", "IN_PROGRESS"] },
              dueDate: { lte: endOfToday },
            },
          },
        },
      },
    },
  });

  let sent = 0;
  let errors = 0;

  for (const member of membersWithPending) {
    const count = member._count.assignments;
    if (count === 0) continue;

    try {
      const delivered = await sendPushToMember(member.id, {
        title: "Tareas pendientes",
        body: count === 1
          ? `Tenés 1 tarea pendiente para hoy`
          : `Tenés ${count} tareas pendientes para hoy`,
        url: "/dashboard",
      });
      sent += delivered;
    } catch {
      errors++;
    }
  }

  return { sent, errors };
}

/** Send WhatsApp reminders to members with linked WhatsApp and pending tasks due today. */
async function sendWhatsAppReminders(): Promise<{ sent: number; errors: number }> {
  if (!isWhatsAppConfigured()) return { sent: 0, errors: 0 };

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const membersWithPending = await prisma.member.findMany({
    where: {
      isActive: true,
      whatsappLink: { is: { isActive: true, verifiedAt: { not: null } } },
      assignments: {
        some: {
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueDate: { lte: endOfToday },
        },
      },
    },
    include: {
      whatsappLink: { select: { phoneNumber: true } },
      _count: {
        select: {
          assignments: {
            where: {
              status: { in: ["PENDING", "IN_PROGRESS"] },
              dueDate: { lte: endOfToday },
            },
          },
        },
      },
    },
  });

  let sent = 0;
  let errors = 0;

  for (const member of membersWithPending) {
    const count = member._count.assignments;
    if (count === 0 || !member.whatsappLink) continue;

    const message =
      count === 1
        ? 'Tenés 1 tarea pendiente para hoy. Escribí "tareas" para verla.'
        : `Tenés ${count} tareas pendientes para hoy. Escribí "tareas" para verlas.`;

    try {
      const ok = await sendWhatsAppMessage(member.whatsappLink.phoneNumber, message);
      if (ok) sent++;
      else errors++;
    } catch {
      errors++;
    }
  }

  return { sent, errors };
}

/**
 * POST /api/cron/process
 * Job programado: (1) redistribución por ausencias, (2) limpieza de notificaciones, (3) push reminders, (4) WhatsApp reminders.
 * Protegido por CRON_SECRET.
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

    const [absenceResult, cleanupResult, pushResult, whatsappResult] = await Promise.all([
      processAbsenceRedistribution(),
      cleanupOldNotifications(),
      sendDailyPushReminders(),
      sendWhatsAppReminders(),
    ]);

    return NextResponse.json({
      success: true,
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
      push: {
        sent: pushResult.sent,
        errors: pushResult.errors,
      },
      whatsapp: {
        sent: whatsappResult.sent,
        errors: whatsappResult.errors,
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
      "Redistribuye asignaciones por ausencias activas, limpia notificaciones antiguas, envía push y WhatsApp reminders",
  });
}
