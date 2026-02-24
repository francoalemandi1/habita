import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { completeAssignmentSchema } from "@/lib/validations/assignment";
import { getBestAssignee } from "@/lib/assignment-algorithm";
import { computeDueDateForFrequency } from "@/lib/due-date";
import { createNotificationForMembers } from "@/lib/notification-service";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ assignmentId: string }>;
}

/**
 * POST /api/assignments/[assignmentId]/complete
 * Mark an assignment as completed and award points
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { assignmentId } = await params;
    const body: unknown = await request.json();

    const validation = completeAssignmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    // Get assignment with task details
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        householdId: member.householdId,
      },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            weight: true,
            frequency: true,
          },
        },
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
    }

    if (assignment.status === "COMPLETED" || assignment.status === "VERIFIED") {
      return NextResponse.json({ error: "La tarea ya fue completada" }, { status: 400 });
    }

    if (assignment.status === "CANCELLED") {
      return NextResponse.json({ error: "La tarea fue cancelada" }, { status: 400 });
    }

    const now = new Date();

    // Update assignment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Atomic status guard: only complete if still PENDING/IN_PROGRESS
      const updated = await tx.assignment.updateMany({
        where: {
          id: assignmentId,
          householdId: member.householdId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
        data: {
          status: "COMPLETED",
          completedAt: now,
          notes: validation.data.notes ?? assignment.notes,
        },
      });

      if (updated.count === 0) {
        throw new Error("ALREADY_COMPLETED");
      }

      // Re-fetch for response
      const updatedAssignment = await tx.assignment.findUniqueOrThrow({
        where: { id: assignmentId },
        include: {
          task: {
            select: {
              id: true,
              name: true,
              weight: true,
            },
          },
          member: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        assignment: updatedAssignment,
      };
    });

    // Spec §2.1: al completar, crear siguiente instancia y asignar
    let nextAssignment = null;
    let nextAssignmentError = false;
    if (assignment.task.frequency !== "ONCE") {
      try {
        const nextDue = computeDueDateForFrequency(
          assignment.task.frequency,
          now
        );
        const { best } = await getBestAssignee(
          assignment.householdId,
          assignment.taskId,
          nextDue
        );
        if (best) {
          nextAssignment = await prisma.assignment.create({
            data: {
              taskId: assignment.taskId,
              memberId: best.memberId,
              householdId: assignment.householdId,
              dueDate: nextDue,
              status: "PENDING",
            },
          });
        }
      } catch (err) {
        nextAssignmentError = true;
        console.error("Error creating next assignment:", err);
      }
    }

    // Auto-finalize plan if all assignments from the plan period are now completed
    let planFinalized = false;
    let finalizedPlanId: string | undefined;
    try {
      const activePlan = await prisma.weeklyPlan.findFirst({
        where: {
          householdId: member.householdId,
          status: "APPLIED",
        },
        select: { id: true, createdAt: true, expiresAt: true, appliedAt: true },
      });

      if (activePlan) {
        const planStartDate = activePlan.appliedAt ?? activePlan.createdAt;
        const remainingCount = await prisma.assignment.count({
          where: {
            householdId: member.householdId,
            status: { in: ["PENDING", "IN_PROGRESS"] },
            createdAt: { gte: planStartDate },
          },
        });

        if (remainingCount === 0) {
          await prisma.weeklyPlan.update({
            where: { id: activePlan.id },
            data: { status: "COMPLETED" },
          });
          planFinalized = true;
          finalizedPlanId = activePlan.id;

          // Notify all members that the plan was completed
          const householdMemberIds = await prisma.member.findMany({
            where: { householdId: member.householdId, isActive: true },
            select: { id: true },
          });
          await createNotificationForMembers(
            householdMemberIds.map((m) => m.id),
            {
              type: "PLAN_APPLIED",
              title: "Plan completado",
              message: "Todas las tareas del plan fueron completadas",
              actionUrl: "/plan",
            }
          );
        }
      }
    } catch (err) {
      console.error("Error auto-finalizing plan (non-blocking):", err);
    }

    return NextResponse.json({
      ...result,
      planFinalized,
      finalizedPlanId: planFinalized ? finalizedPlanId : undefined,
      nextAssignment: nextAssignment
        ? {
            id: nextAssignment.id,
            memberId: nextAssignment.memberId,
            dueDate: nextAssignment.dueDate,
          }
        : undefined,
      warnings: {
        nextAssignmentCreated: !nextAssignmentError,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_COMPLETED") {
      return NextResponse.json({ error: "La tarea ya fue completada" }, { status: 400 });
    }
    return handleApiError(error, { route: "/api/assignments/[assignmentId]/complete", method: "POST" });
  }
}
