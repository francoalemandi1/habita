import { after, NextResponse } from "next/server";
import { processAbsenceRedistribution } from "@/lib/absence-redistribution";
import { cleanupOldNotifications } from "@/lib/notification-service";
import { expirePastEvents } from "@/lib/events/expire-events";
import { cleanupExpiredMobileAuthSessions } from "@/lib/mobile-auth";
import { handleApiError } from "@/lib/api-response";
import { processServiceBilling } from "@/lib/cron/jobs/service-billing";
import { processProactiveNotifications } from "@/lib/cron/jobs/proactive-notifications";
import { processCulturalRecommendations } from "@/lib/cron/jobs/cultural-recommendations";
import { processDealAlerts } from "@/lib/cron/jobs/deal-alerts";
import { processMorningBriefing } from "@/lib/cron/jobs/morning-briefing";
import { processOverdueTaskAlerts } from "@/lib/cron/jobs/overdue-task-alerts";
import { processSpendingAnomalyAlerts } from "@/lib/cron/jobs/spending-anomaly-alerts";

/**
 * Runs one cron job, turning a rejection into `undefined` plus an entry in
 * `failedJobs`, so a failing job never discards the other jobs' results.
 */
export async function runJob<T>(
  name: string,
  run: () => Promise<T>,
  failedJobs: string[],
): Promise<T | undefined> {
  try {
    return await run();
  } catch (error) {
    failedJobs.push(name);
    console.error(`[cron/process] Job failed: ${name}`, error);
    return undefined;
  }
}

/**
 * Job programado: (1) redistribución por ausencias, (2) limpieza de notificaciones, (3) push reminders, (4) gastos recurrentes.
 */
export async function runCronProcess(cronSecret: string) {
  try {
    const failedJobs: string[] = [];
    const [
      absenceResult,
      cleanupResult,
      billingResult,
      expireResult,
      mobileAuthCleanup,
      proactiveResult,
      culturalResult,
      dealResult,
      morningBriefingResult,
      overdueTaskResult,
      spendingAnomalyResult,
    ] = await Promise.all([
      runJob("absenceRedistribution", processAbsenceRedistribution, failedJobs),
      runJob("notificationCleanup", cleanupOldNotifications, failedJobs),
      runJob("serviceBilling", processServiceBilling, failedJobs),
      runJob("expireEvents", expirePastEvents, failedJobs),
      runJob("mobileAuthCleanup", cleanupExpiredMobileAuthSessions, failedJobs),
      runJob("proactiveNotifications", processProactiveNotifications, failedJobs),
      runJob("culturalRecommendations", processCulturalRecommendations, failedJobs),
      runJob("dealAlerts", processDealAlerts, failedJobs),
      runJob("morningBriefing", processMorningBriefing, failedJobs),
      runJob("overdueTaskAlerts", processOverdueTaskAlerts, failedJobs),
      runJob("spendingAnomalyAlerts", processSpendingAnomalyAlerts, failedJobs),
    ]);

    // Fire-and-forget: trigger events ingest and grocery-deals in background
    // Each gets its own serverless invocation to avoid timeout
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    after(async () => {
      try {
        await fetch(`${baseUrl}/api/cron/events/ingest`, {
          method: "POST",
          headers: { authorization: `Bearer ${cronSecret}` },
        });
      } catch (err) {
        console.error("[cron/process] Failed to trigger events/ingest:", err);
      }

      try {
        await fetch(`${baseUrl}/api/cron/grocery-deals`, {
          method: "POST",
          headers: { authorization: `Bearer ${cronSecret}` },
        });
      } catch (err) {
        console.error("[cron/process] Failed to trigger grocery-deals:", err);
      }
    });

    return NextResponse.json({
      success: true,
      ...(absenceResult && {
        absences: {
          processedAbsences: absenceResult.processedAbsences,
          reassigned: absenceResult.reassigned,
          postponed: absenceResult.postponed,
          errors: absenceResult.errors,
        },
      }),
      ...(cleanupResult && {
        notifications: {
          deletedRead: cleanupResult.deletedRead,
          deletedUnread: cleanupResult.deletedUnread,
        },
      }),
      ...(billingResult && {
        serviceBilling: {
          generated: billingResult.generated,
          errors: billingResult.errors,
        },
      }),
      ...(expireResult && {
        events: {
          expiredEvents: expireResult.expiredEvents,
          deletedRestaurantCache: expireResult.deletedRestaurantCache,
        },
      }),
      ...(mobileAuthCleanup && {
        mobileAuth: {
          revokedExpired: mobileAuthCleanup.revokedExpired,
          deletedOldRevoked: mobileAuthCleanup.deletedOldRevoked,
        },
      }),
      proactiveNotifications: {
        ...(proactiveResult && {
          serviceDueSoon: proactiveResult.serviceDueSoon,
          taskReminder: proactiveResult.taskReminder,
          expenseWeeklySummary: proactiveResult.expenseWeeklySummary,
        }),
        ...(culturalResult !== undefined && { culturalRecommendation: culturalResult }),
        ...(dealResult !== undefined && { dealAlert: dealResult }),
        ...(morningBriefingResult !== undefined && { morningBriefing: morningBriefingResult }),
        ...(overdueTaskResult !== undefined && { overdueTaskAlerts: overdueTaskResult }),
        ...(spendingAnomalyResult !== undefined && {
          spendingAnomalyAlerts: spendingAnomalyResult,
        }),
      },
      failedJobs,
      triggeredInBackground: ["events/ingest", "grocery-deals"],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/cron/process", method: "POST" });
  }
}
