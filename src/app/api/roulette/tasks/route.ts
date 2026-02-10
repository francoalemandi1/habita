import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

/**
 * GET /api/roulette/tasks
 * Get all roulette-eligible tasks for the current household.
 */
export async function GET() {
  try {
    const member = await requireMember();

    const tasks = await prisma.task.findMany({
      where: {
        householdId: member.householdId,
        isActive: true,
        isRouletteEligible: true,
      },
      select: {
        id: true,
        name: true,
        weight: true,
        frequency: true,
        estimatedMinutes: true,
      },
      orderBy: { name: "asc" },
      take: 50,
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    return handleApiError(error, { route: "/api/roulette/tasks", method: "GET" });
  }
}
