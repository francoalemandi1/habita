import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember, requirePermission } from "@/lib/session";
import { createTaskSchema } from "@/lib/validations/task";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * GET /api/tasks
 * Get all tasks for the current household
 * Query params: limit (default 50, max 100), offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();
    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10),
      MAX_LIMIT
    );
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: {
          householdId: member.householdId,
          isActive: true,
        },
        orderBy: { name: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.task.count({
        where: {
          householdId: member.householdId,
          isActive: true,
        },
      }),
    ]);

    return NextResponse.json({
      tasks,
      pagination: { total, limit, offset, hasMore: offset + tasks.length < total },
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/tasks", method: "GET" });
  }
}

/**
 * POST /api/tasks
 * Create a new task for the current household
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requirePermission("task:create");
    const body: unknown = await request.json();

    const validation = createTaskSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        ...validation.data,
        householdId: member.householdId,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: "/api/tasks", method: "POST" });
  }
}
