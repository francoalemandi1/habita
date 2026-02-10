import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember, requirePermission } from "@/lib/session";
import { updateTaskSchema } from "@/lib/validations/task";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

/**
 * GET /api/tasks/[taskId]
 * Get a specific task (must be from same household)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { taskId } = await params;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        householdId: member.householdId,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    return handleApiError(error, { route: "/api/tasks/[taskId]", method: "GET" });
  }
}

/**
 * PATCH /api/tasks/[taskId]
 * Update a task (must be from same household)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requirePermission("task:edit");
    const { taskId } = await params;
    const body: unknown = await request.json();

    const validation = updateTaskSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    // Verify task belongs to household
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        householdId: member.householdId,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: validation.data,
    });

    return NextResponse.json({ task });
  } catch (error) {
    return handleApiError(error, { route: "/api/tasks/[taskId]", method: "PATCH" });
  }
}

/**
 * DELETE /api/tasks/[taskId]
 * Soft delete a task (mark as inactive)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requirePermission("task:delete");
    const { taskId } = await params;

    // Verify task belongs to household
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        householdId: member.householdId,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    // Soft delete
    await prisma.task.update({
      where: { id: taskId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/tasks/[taskId]", method: "DELETE" });
  }
}
