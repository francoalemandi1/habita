import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { z } from "zod";

import type { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ planId: string }>;
}

const finalizeSchema = z.object({
  assignmentIds: z.array(z.string().min(1)).max(500),
});

/**
 * POST /api/plans/[planId]/finalize
 * Finalize a plan: complete selected assignments, cancel the rest.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { planId } = await params;

    const body: unknown = await request.json();
    const validation = finalizeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { assignmentIds } = validation.data;

    // Verify plan exists, belongs to household, and is APPLIED
    const plan = await prisma.weeklyPlan.findFirst({
      where: {
        id: planId,
        householdId: member.householdId,
        status: "APPLIED",
      },
      select: { id: true, createdAt: true, expiresAt: true, appliedAt: true, startDate: true },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan no encontrado o no está activo" },
        { status: 404 }
      );
    }

    const now = new Date();
    const planStartDate = plan.startDate ?? plan.appliedAt ?? plan.createdAt;

    // Transaction: complete assignments, cancel remaining, finalize plan
    const result = await prisma.$transaction(async (tx) => {
      // Complete selected assignments
      let totalCompleted = 0;
      if (assignmentIds.length > 0) {
        const completed = await tx.assignment.updateMany({
          where: {
            id: { in: assignmentIds },
            householdId: member.householdId,
            status: { in: ["PENDING", "IN_PROGRESS"] },
            createdAt: { gte: planStartDate },
          },
          data: {
            status: "COMPLETED",
            completedAt: now,
          },
        });
        totalCompleted = completed.count;
      }

      // Cancel remaining PENDING/IN_PROGRESS assignments from the plan period
      const cancelled = await tx.assignment.updateMany({
        where: {
          householdId: member.householdId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          createdAt: { gte: planStartDate },
        },
        data: { status: "CANCELLED" },
      });

      // Mark plan as COMPLETED
      await tx.weeklyPlan.update({
        where: { id: planId },
        data: { status: "COMPLETED" },
      });

      return { totalCompleted, cancelledCount: cancelled.count };
    });

    return NextResponse.json({
      success: true,
      completed: result.totalCompleted,
      cancelled: result.cancelledCount,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/plans/[planId]/finalize", method: "POST" });
  }
}
