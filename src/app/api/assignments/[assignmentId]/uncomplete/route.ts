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
        memberId: true,
        status: true,
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

    // Revert assignment to PENDING
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        status: "PENDING",
        completedAt: null,
      },
    });

    return NextResponse.json({ success: true, status: "PENDING" });
  } catch (error) {
    return handleApiError(error, {
      route: "/api/assignments/[assignmentId]/uncomplete",
      method: "POST",
    });
  }
}
