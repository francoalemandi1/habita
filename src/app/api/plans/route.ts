import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

/**
 * GET /api/plans
 * Returns past plans for the household (completed, expired, rejected, or applied+expired).
 */
export async function GET() {
  try {
    const member = await requireMember();

    const pastPlans = await prisma.weeklyPlan.findMany({
      where: {
        householdId: member.householdId,
        OR: [
          { status: { in: ["COMPLETED", "EXPIRED", "REJECTED"] } },
          { status: "APPLIED", expiresAt: { lte: new Date() } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        status: true,
        balanceScore: true,
        durationDays: true,
        assignments: true,
        notes: true,
        createdAt: true,
        appliedAt: true,
        expiresAt: true,
      },
    });

    const serialized = pastPlans.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      appliedAt: p.appliedAt?.toISOString() ?? null,
      expiresAt: p.expiresAt.toISOString(),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    return handleApiError(error, { route: "/api/plans", method: "GET" });
  }
}
