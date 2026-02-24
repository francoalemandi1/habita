import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { updateAssignmentSchema } from "@/lib/validations/assignment";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ assignmentId: string }>;
}

/**
 * GET /api/assignments/[assignmentId]
 * Get a specific assignment
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { assignmentId } = await params;

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        householdId: member.householdId,
      },
      include: {
        task: true,
        member: true,
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ assignment });
  } catch (error) {
    return handleApiError(error, { route: "/api/assignments/[assignmentId]", method: "GET" });
  }
}

/**
 * PATCH /api/assignments/[assignmentId]
 * Update assignment status or notes
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { assignmentId } = await params;
    const body: unknown = await request.json();

    const validation = updateAssignmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    // Verify assignment belongs to household
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        householdId: member.householdId,
      },
      select: { id: true },
    });

    if (!existingAssignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
    }

    const assignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: validation.data,
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

    return NextResponse.json({ assignment });
  } catch (error) {
    return handleApiError(error, { route: "/api/assignments/[assignmentId]", method: "PATCH" });
  }
}

/**
 * DELETE /api/assignments/[assignmentId]
 * Cancel an assignment
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { assignmentId } = await params;

    // Verify assignment belongs to household
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        householdId: member.householdId,
      },
      select: { id: true },
    });

    if (!existingAssignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
    }

    // Mark as cancelled instead of deleting
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/assignments/[assignmentId]", method: "DELETE" });
  }
}
