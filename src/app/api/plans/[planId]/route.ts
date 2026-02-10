import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

/**
 * DELETE /api/plans/[planId]
 * Discard a PENDING plan (mark as EXPIRED).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const member = await requireMember();
    const { planId } = await params;

    const plan = await prisma.weeklyPlan.findFirst({
      where: {
        id: planId,
        householdId: member.householdId,
        status: "PENDING",
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan no encontrado o no está pendiente" },
        { status: 404 }
      );
    }

    await prisma.weeklyPlan.update({
      where: { id: planId },
      data: { status: "EXPIRED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/plans/[planId]", method: "DELETE" });
  }
}
