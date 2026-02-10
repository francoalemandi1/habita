import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember, requirePermission } from "@/lib/session";
import { assignmentStatusSchema, createAssignmentSchema } from "@/lib/validations/assignment";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * GET /api/assignments
 * Get assignments for the current household
 * Query params: status, memberId, from, to, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();
    const searchParams = request.nextUrl.searchParams;

    const statusParam = searchParams.get("status");
    const memberId = searchParams.get("memberId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

    const parsedStatus = statusParam ? assignmentStatusSchema.safeParse(statusParam) : null;

    const dueDateFilter = from && to
      ? { gte: new Date(from), lte: new Date(to) }
      : from
        ? { gte: new Date(from) }
        : to
          ? { lte: new Date(to) }
          : undefined;

    const whereClause = {
      householdId: member.householdId,
      ...(parsedStatus?.success && { status: parsedStatus.data }),
      ...(memberId && { memberId }),
      ...(dueDateFilter && { dueDate: dueDateFilter }),
    };

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where: whereClause,
        include: {
          task: {
            select: {
              id: true,
              name: true,
              weight: true,
              frequency: true,
              estimatedMinutes: true,
            },
          },
          member: {
            select: {
              id: true,
              name: true,
              memberType: true,
            },
          },
        },
        orderBy: { dueDate: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.assignment.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      assignments,
      pagination: { total, limit, offset, hasMore: offset + assignments.length < total },
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/assignments", method: "GET" });
  }
}

/**
 * POST /api/assignments
 * Create a new assignment (manual assignment)
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requirePermission("task:assign");
    const body: unknown = await request.json();

    const validation = createAssignmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { taskId, memberId, dueDate, notes } = validation.data;

    // Verify task belongs to household
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        householdId: member.householdId,
        isActive: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    // Verify member belongs to household
    const targetMember = await prisma.member.findFirst({
      where: {
        id: memberId,
        householdId: member.householdId,
        isActive: true,
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    // Prevent duplicate: skip if a pending/in-progress assignment already exists for this task + member
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        taskId,
        memberId,
        householdId: member.householdId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      include: {
        task: { select: { id: true, name: true, weight: true } },
        member: { select: { id: true, name: true } },
      },
    });

    if (existingAssignment) {
      return NextResponse.json({ assignment: existingAssignment }, { status: 200 });
    }

    const assignment = await prisma.assignment.create({
      data: {
        taskId,
        memberId,
        householdId: member.householdId,
        dueDate,
        notes,
      },
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

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: "/api/assignments", method: "POST" });
  }
}
