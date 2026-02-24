import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { assignmentStatusSchema } from "@/lib/validations/assignment";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

/**
 * GET /api/assignments/my
 * Get the current member's assignments
 * Query params: status, from, to
 */
export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();
    const searchParams = request.nextUrl.searchParams;

    const statusParam = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const parsedStatus = statusParam ? assignmentStatusSchema.safeParse(statusParam) : null;

    const assignments = await prisma.assignment.findMany({
      where: {
        memberId: member.id,
        ...(parsedStatus?.success && { status: parsedStatus.data }),
        ...(from && { dueDate: { gte: new Date(from) } }),
        ...(to && { dueDate: { lte: new Date(to) } }),
      },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            description: true,
            weight: true,
            frequency: true,
            estimatedMinutes: true,
          },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
      take: 200,
    });

    // Group by status for convenience
    const pending = assignments.filter(
      (a) => a.status === "PENDING" || a.status === "IN_PROGRESS"
    );
    const completed = assignments.filter(
      (a) => a.status === "COMPLETED" || a.status === "VERIFIED"
    );

    return NextResponse.json({
      assignments,
      pending,
      completed,
      stats: {
        total: assignments.length,
        pendingCount: pending.length,
        completedCount: completed.length,
      },
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/assignments/my", method: "GET" });
  }
}
