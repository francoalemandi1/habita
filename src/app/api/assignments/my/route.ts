import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";

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

    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const assignments = await prisma.assignment.findMany({
      where: {
        memberId: member.id,
        ...(status && { status: status as never }),
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
    const overdue = assignments.filter((a) => a.status === "OVERDUE");

    return NextResponse.json({
      assignments,
      pending,
      completed,
      overdue,
      stats: {
        total: assignments.length,
        pendingCount: pending.length,
        completedCount: completed.length,
        overdueCount: overdue.length,
      },
    });
  } catch (error) {
    console.error("GET /api/assignments/my error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error fetching assignments" }, { status: 500 });
  }
}
