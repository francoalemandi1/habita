import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

/**
 * GET /api/members
 * Get all members of the current household
 */
export async function GET() {
  try {
    const currentMember = await requireMember();

    const members = await prisma.member.findMany({
      where: {
        householdId: currentMember.householdId,
        isActive: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 100,
    });

    return NextResponse.json({ members });
  } catch (error) {
    return handleApiError(error, { route: "/api/members", method: "GET" });
  }
}
