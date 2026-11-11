import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { completeAssignmentSchema } from "@/lib/validations/assignment";
import { completeAssignment } from "@/lib/assignment-complete";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ assignmentId: string }>;
}

/**
 * POST /api/assignments/[assignmentId]/complete
 * Mark an assignment as completed and award points
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { assignmentId } = await params;
    const body: unknown = await request.json();

    const validation = completeAssignmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const result = await completeAssignment({
      householdId: member.householdId,
      assignmentId,
      member: { id: member.id, name: member.name },
      notes: validation.data.notes,
    });

    switch (result.kind) {
      case "not_found":
        return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
      case "already_completed":
        return NextResponse.json({ error: "La tarea ya fue completada" }, { status: 400 });
      case "cancelled":
        return NextResponse.json({ error: "La tarea fue cancelada" }, { status: 400 });
      case "completed":
        return NextResponse.json({
          assignment: result.assignment,
          completedBy: result.completedBy,
          planFinalized: result.planFinalized,
          finalizedPlanId: result.finalizedPlanId,
          nextAssignment: result.nextAssignment,
          warnings: result.warnings,
        });
    }
  } catch (error) {
    return handleApiError(error, { route: "/api/assignments/[assignmentId]/complete", method: "POST" });
  }
}
