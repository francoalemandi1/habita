import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { rouletteAssignSchema } from "@/lib/validations/roulette";

import type { NextRequest } from "next/server";

/**
 * POST /api/roulette/assign
 * Create an assignment after the user confirms the roulette result.
 * Supports both existing tasks (taskId) and custom tasks (customTaskName).
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body: unknown = await request.json();

    const validation = rouletteAssignSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos", code: "BAD_REQUEST" },
        { status: 400 },
      );
    }

    const {
      memberId,
      taskId,
      customTaskName,
      customTaskWeight,
      customTaskFrequency,
      customTaskEstimatedMinutes,
    } = validation.data;
    const householdId = member.householdId;

    let resolvedTaskId: string;
    let taskName: string;

    if (taskId) {
      // Existing task — verify member + task belong to household (parallel)
      const [targetMemberResult, task] = await Promise.all([
        prisma.member.findFirst({
          where: { id: memberId, householdId, isActive: true },
          select: { id: true, name: true, avatarUrl: true, memberType: true },
        }),
        prisma.task.findFirst({
          where: { id: taskId, householdId, isActive: true },
          select: { id: true, name: true },
        }),
      ]);

      if (!targetMemberResult) {
        return NextResponse.json(
          { error: "Miembro no encontrado", code: "NOT_FOUND" },
          { status: 404 },
        );
      }

      if (!task) {
        return NextResponse.json(
          { error: "Tarea no encontrada", code: "NOT_FOUND" },
          { status: 404 },
        );
      }

      resolvedTaskId = task.id;
      taskName = task.name;
    } else {
      // Custom task — need to verify member first, then create task
      const targetMemberResult = await prisma.member.findFirst({
        where: { id: memberId, householdId, isActive: true },
        select: { id: true, name: true, avatarUrl: true, memberType: true },
      });

      if (!targetMemberResult) {
        return NextResponse.json(
          { error: "Miembro no encontrado", code: "NOT_FOUND" },
          { status: 404 },
        );
      }

      const newTask = await prisma.task.create({
        data: {
          name: customTaskName!,
          householdId,
          frequency: customTaskFrequency ?? "ONCE",
          weight: customTaskWeight ?? 1,
          estimatedMinutes: customTaskEstimatedMinutes ?? null,
        },
        select: { id: true, name: true },
      });

      resolvedTaskId = newTask.id;
      taskName = newTask.name;
    }

    // Check for existing pending assignment for the same task + member
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        taskId: resolvedTaskId,
        memberId,
        householdId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      include: {
        task: { select: { id: true, name: true, weight: true, frequency: true } },
        member: { select: { id: true, name: true, avatarUrl: true, memberType: true } },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { assignment: existingAssignment, taskName },
        { status: 200 },
      );
    }

    // Create assignment with dueDate = end of today
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const assignment = await prisma.assignment.create({
      data: {
        taskId: resolvedTaskId,
        memberId,
        householdId,
        dueDate: endOfToday,
        notes: "Asignado por ruleta",
      },
      include: {
        task: { select: { id: true, name: true, weight: true, frequency: true } },
        member: { select: { id: true, name: true, avatarUrl: true, memberType: true } },
      },
    });

    return NextResponse.json(
      {
        assignment,
        taskName,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, { route: "/api/roulette/assign", method: "POST" });
  }
}
