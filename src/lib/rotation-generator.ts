import { prisma } from "./prisma";
import { getBestAssignee } from "./assignment-algorithm";
import { createNotification } from "./notification-service";

import type { TaskFrequency } from "@prisma/client";

/**
 * Process all rotations and generate assignments for those that are due.
 * This should be called periodically (e.g., via cron job or API endpoint).
 */
export async function processRotations(): Promise<{
  processed: number;
  generated: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let generated = 0;

  // Get active rotations that are due (capped for safety)
  const dueRotations = await prisma.taskRotation.findMany({
    where: {
      isActive: true,
      nextDueDate: { lte: now },
    },
    include: {
      task: { select: { id: true, name: true, frequency: true } },
    },
    take: 500,
  });

  for (const rotation of dueRotations) {
    try {
      // Find the best assignee
      const { best: bestAssignee } = await getBestAssignee(
        rotation.householdId,
        rotation.taskId,
        rotation.nextDueDate ?? now
      );

      if (!bestAssignee) {
        errors.push(`No eligible member for task ${rotation.task.name}`);
        continue;
      }

      // Create the assignment
      await prisma.assignment.create({
        data: {
          taskId: rotation.taskId,
          memberId: bestAssignee.memberId,
          householdId: rotation.householdId,
          dueDate: rotation.nextDueDate ?? now,
        },
      });

      // Update rotation with next due date
      const nextDueDate = calculateNextDueDate(rotation.frequency, rotation.nextDueDate ?? now);

      await prisma.taskRotation.update({
        where: { id: rotation.id },
        data: {
          lastGenerated: now,
          nextDueDate,
        },
      });

      // Create reminders for the assignment
      await createRemindersForAssignment(
        rotation.taskId,
        bestAssignee.memberId,
        rotation.nextDueDate ?? now
      );

      generated++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Error processing rotation ${rotation.id}: ${message}`);
    }
  }

  return {
    processed: dueRotations.length,
    generated,
    errors,
  };
}

/**
 * Calculate the next due date based on frequency.
 */
function calculateNextDueDate(frequency: TaskFrequency, from: Date): Date {
  const next = new Date(from);
  next.setHours(12, 0, 0, 0);

  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      // ONCE - should not have rotations
      break;
  }

  return next;
}

/**
 * Create reminders for a new assignment.
 */
async function createRemindersForAssignment(
  assignmentId: string,
  memberId: string,
  dueDate: Date
): Promise<void> {
  const now = new Date();
  const reminders: { reminderType: "DUE_SOON" | "DUE_TODAY" | "OVERDUE"; scheduledFor: Date }[] = [];

  // DUE_SOON: 24 hours before
  const dueSoon = new Date(dueDate);
  dueSoon.setDate(dueSoon.getDate() - 1);
  dueSoon.setHours(9, 0, 0, 0);
  if (dueSoon > now) {
    reminders.push({ reminderType: "DUE_SOON", scheduledFor: dueSoon });
  }

  // DUE_TODAY: Morning of due date
  const dueToday = new Date(dueDate);
  dueToday.setHours(9, 0, 0, 0);
  if (dueToday > now) {
    reminders.push({ reminderType: "DUE_TODAY", scheduledFor: dueToday });
  }

  // Create reminders
  if (reminders.length > 0) {
    await prisma.taskReminder.createMany({
      data: reminders.map((r) => ({
        assignmentId,
        memberId,
        reminderType: r.reminderType,
        scheduledFor: r.scheduledFor,
      })),
    });
  }
}

/**
 * Process reminders that are due to be sent.
 * Returns the reminders that were marked as sent.
 */
export async function processDueReminders(): Promise<{
  processed: number;
  reminders: Array<{
    id: string;
    type: string;
    taskName: string;
    memberName: string;
  }>;
}> {
  const now = new Date();

  // Get reminders that are due (capped for safety)
  const dueReminders = await prisma.taskReminder.findMany({
    where: {
      sentAt: null,
      scheduledFor: { lte: now },
    },
    include: {
      assignment: {
        include: {
          task: { select: { name: true } },
        },
      },
      member: { select: { name: true } },
    },
    take: 500,
  });

  // Mark them as sent and create notifications
  if (dueReminders.length > 0) {
    await prisma.taskReminder.updateMany({
      where: {
        id: { in: dueReminders.map((r) => r.id) },
      },
      data: { sentAt: now },
    });

    for (const reminder of dueReminders) {
      const messageByType: Record<string, string> = {
        DUE_SOON: `"${reminder.assignment.task.name}" vence mañana`,
        DUE_TODAY: `"${reminder.assignment.task.name}" vence hoy`,
        OVERDUE: `"${reminder.assignment.task.name}" está atrasada`,
      };
      await createNotification({
        memberId: reminder.memberId,
        type: "REMINDER_DUE",
        title: "Recordatorio",
        message: messageByType[reminder.reminderType] ?? `"${reminder.assignment.task.name}" necesita tu atención`,
        actionUrl: "/my-tasks",
      });
    }
  }

  return {
    processed: dueReminders.length,
    reminders: dueReminders.map((r) => ({
      id: r.id,
      type: r.reminderType,
      taskName: r.assignment.task.name,
      memberName: r.member.name,
    })),
  };
}
