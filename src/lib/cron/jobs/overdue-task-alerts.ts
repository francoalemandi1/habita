import { prisma } from "@/lib/prisma";
import { deliverNotification } from "@/lib/push-delivery";

/**
 * processOverdueTaskAlerts — sends TASK_OVERDUE push for assignments past due date.
 * Grace period: 4 hours after dueDate. Max 1 alert per assignment.
 */
export async function processOverdueTaskAlerts(): Promise<number> {
  const now = new Date();
  const gracePeriod = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let sent = 0;

  const overdueAssignments = await prisma.assignment.findMany({
    where: {
      status: "PENDING",
      dueDate: { lt: gracePeriod },
    },
    select: {
      id: true,
      memberId: true,
      householdId: true,
      task: { select: { name: true } },
    },
    take: 100,
  });

  for (const assignment of overdueAssignments) {
    // Dedup: skip if already sent TASK_OVERDUE for this assignment today
    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        memberId: assignment.memberId,
        type: "TASK_OVERDUE",
        createdAt: { gte: startOfToday },
        metadata: { path: ["assignmentId"], equals: assignment.id },
      },
      select: { id: true },
    });

    if (alreadyNotified) continue;

    const household = await prisma.household.findUnique({
      where: { id: assignment.householdId },
      select: { timezone: true },
    });

    await deliverNotification({
      memberId: assignment.memberId,
      type: "TASK_OVERDUE",
      title: "Tarea vencida",
      message: `"${assignment.task.name}" está vencida. Completala cuando puedas.`,
      actionUrl: "/tasks",
      metadata: { assignmentId: assignment.id },
      householdTimezone: household?.timezone,
    });

    sent++;
  }

  return sent;
}
