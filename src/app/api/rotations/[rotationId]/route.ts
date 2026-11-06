import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember, requirePermission } from "@/lib/session";
import { updateRotationSchema } from "@/lib/validations/rotation";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";
import type { Task } from "@prisma/client";

interface RouteParams {
  params: Promise<{ rotationId: string }>;
}

type RotatingTask = Pick<Task, "id" | "name" | "frequency" | "weight" | "createdAt" | "updatedAt">;

/** Same shape as the GET /api/rotations list — the rotationId param is the taskId. */
function toRotationView(task: RotatingTask, householdId: string, isActive: boolean) {
  return {
    id: task.id,
    taskId: task.id,
    householdId,
    frequency: task.frequency,
    isActive,
    lastGenerated: null,
    nextDueDate: null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    task: {
      id: task.id,
      name: task.name,
      frequency: task.frequency,
      weight: task.weight,
    },
  };
}

/**
 * GET /api/rotations/[rotationId]
 * Get a specific rotating task (rotationId is the task id).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { rotationId } = await params;

    const task = await prisma.task.findFirst({
      where: {
        id: rotationId,
        householdId: member.householdId,
        isRotating: true,
      },
      select: { id: true, name: true, frequency: true, weight: true, createdAt: true, updatedAt: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Rotación no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ rotation: toRotationView(task, member.householdId, true) });
  } catch (error) {
    return handleApiError(error, { route: "/api/rotations/[rotationId]", method: "GET" });
  }
}

/**
 * PATCH /api/rotations/[rotationId]
 * Toggle a rotating task's isActive — maps directly onto Task.isRotating.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requirePermission("rotation:manage");
    const { rotationId } = await params;
    const body: unknown = await request.json();

    const validation = updateRotationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const existingTask = await prisma.task.findFirst({
      where: {
        id: rotationId,
        householdId: member.householdId,
        isRotating: true,
      },
      select: { id: true },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Rotación no encontrada" }, { status: 404 });
    }

    const isActive = validation.data.isActive ?? true;

    const task = await prisma.task.update({
      where: { id: rotationId },
      data: { isRotating: isActive },
      select: { id: true, name: true, frequency: true, weight: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ rotation: toRotationView(task, member.householdId, isActive) });
  } catch (error) {
    return handleApiError(error, { route: "/api/rotations/[rotationId]", method: "PATCH" });
  }
}

/**
 * DELETE /api/rotations/[rotationId]
 * Turn a rotating task back into a regular task.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requirePermission("rotation:manage");
    const { rotationId } = await params;

    const existingTask = await prisma.task.findFirst({
      where: {
        id: rotationId,
        householdId: member.householdId,
        isRotating: true,
      },
      select: { id: true },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Rotación no encontrada" }, { status: 404 });
    }

    await prisma.task.update({
      where: { id: rotationId },
      data: { isRotating: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/rotations/[rotationId]", method: "DELETE" });
  }
}
