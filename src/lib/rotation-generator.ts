import { prisma } from "./prisma";
import { getBestAssignee } from "./assignment-algorithm";
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

