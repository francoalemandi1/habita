import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { autoAssignSchema } from "@/lib/validations/assignment";
import { autoAssignTask, calculateAssignmentScores } from "@/lib/assignment-algorithm";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

/**
 * POST /api/assignments/auto-assign
 * Auto-assign a task to the best available member
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body: unknown = await request.json();

    const validation = autoAssignSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { taskId, dueDate } = validation.data;

    const result = await autoAssignTask(member.householdId, taskId, dueDate);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: "/api/assignments/auto-assign", method: "POST" });
  }
}

/**
 * GET /api/assignments/auto-assign?taskId=xxx
 * Preview auto-assignment scores without creating an assignment
 */
export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();
    const taskId = request.nextUrl.searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId es requerido" }, { status: 400 });
    }

    const scores = await calculateAssignmentScores(member.householdId, taskId);

    return NextResponse.json({ scores });
  } catch (error) {
    return handleApiError(error, { route: "/api/assignments/auto-assign", method: "GET" });
  }
}
