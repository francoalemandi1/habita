import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ assignmentId: string }>;
}

/**
 * POST /api/assignments/[assignmentId]/uncomplete
 * Revert a completed assignment back to PENDING, undoing points.
 * Only the assigned member can uncomplete their own task.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { assignmentId } = await params;

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        householdId: member.householdId,
      },
      select: {
        id: true,
        taskId: true,
        memberId: true,
        status: true,
        dueDate: true,
        completedAt: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Asignación no encontrada" },
        { status: 404 },
      );
    }

    if (assignment.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Solo se pueden desmarcar tareas completadas" },
        { status: 400 },
      );
    }

    const completedAt = assignment.completedAt;
    await prisma.$transaction(async (tx) => {
      await tx.assignment.update({
        where: { id: assignmentId },
        data: { status: "PENDING", completedAt: null, completedByMemberId: null },
      });
      if (!completedAt) return;
      // Completing a recurring task creates its next occurrence; undoing must
      // remove that occurrence or the household ends up with a duplicate.
      await tx.assignment.deleteMany({
        where: {
          householdId: member.householdId,
          taskId: assignment.taskId,
          status: "PENDING",
          createdAt: { gte: completedAt },
          dueDate: { gt: assignment.dueDate },
        },
      });
    });

    return NextResponse.json({ success: true, status: "PENDING" });
  } catch (error) {
    return handleApiError(error, {
      route: "/api/assignments/[assignmentId]/uncomplete",
      method: "POST",
    });
  }
}
