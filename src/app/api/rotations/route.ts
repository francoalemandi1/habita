import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember, requirePermission } from "@/lib/session";
import { createRotationSchema } from "@/lib/validations/rotation";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";
import type { Task } from "@prisma/client";

type RotatingTask = Pick<Task, "id" | "name" | "frequency" | "weight" | "createdAt" | "updatedAt">;

/**
 * Shape a rotating task as the legacy TaskRotation JSON the web client reads.
 * The task id doubles as the rotation id; frequency always mirrors the task's
 * own frequency now that rotation is just a flag on Task.
 */
function toRotationView(task: RotatingTask, householdId: string) {
  return {
    id: task.id,
    taskId: task.id,
    householdId,
    frequency: task.frequency,
    isActive: true,
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
 * GET /api/rotations
 * List every rotating task for the household.
 */
export async function GET() {
  try {
    const member = await requireMember();

    const tasks = await prisma.task.findMany({
      where: { householdId: member.householdId, isRotating: true },
      select: { id: true, name: true, frequency: true, weight: true, createdAt: true, updatedAt: true },
      orderBy: { name: "asc" },
      take: 200,
    });

    return NextResponse.json({ rotations: tasks.map((task) => toRotationView(task, member.householdId)) });
  } catch (error) {
    return handleApiError(error, { route: "/api/rotations", method: "GET" });
  }
}

/**
 * POST /api/rotations
 * Turn a task into a rotating task.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requirePermission("rotation:manage");
    const body: unknown = await request.json();

    const validation = createRotationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { taskId } = validation.data;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        householdId: member.householdId,
        isActive: true,
      },
      select: { id: true, name: true, frequency: true, weight: true, isRotating: true, createdAt: true, updatedAt: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    if (task.isRotating) {
      return NextResponse.json(
        { error: "Ya existe una rotación para esta tarea" },
        { status: 409 }
      );
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { isRotating: true },
      select: { id: true, name: true, frequency: true, weight: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ rotation: toRotationView(updated, member.householdId) }, { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: "/api/rotations", method: "POST" });
  }
}
