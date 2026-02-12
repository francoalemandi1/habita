import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { planFeedbackSchema } from "@/lib/validations/plan-feedback";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ planId: string }>;
}

/**
 * POST /api/plans/[planId]/feedback
 * Submit feedback for a finalized plan (rating + optional comment).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { planId } = await params;

    const body: unknown = await request.json();
    const validation = planFeedbackSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    // Verify plan exists, belongs to household, and is COMPLETED
    const plan = await prisma.weeklyPlan.findFirst({
      where: {
        id: planId,
        householdId: member.householdId,
        status: "COMPLETED",
      },
      select: { id: true },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan no encontrado o no está finalizado" },
        { status: 404 }
      );
    }

    await prisma.planFeedback.upsert({
      where: {
        planId_memberId: {
          planId,
          memberId: member.id,
        },
      },
      update: {
        rating: validation.data.rating,
        comment: validation.data.comment ?? null,
      },
      create: {
        planId,
        memberId: member.id,
        householdId: member.householdId,
        rating: validation.data.rating,
        comment: validation.data.comment ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/plans/[planId]/feedback", method: "POST" });
  }
}
