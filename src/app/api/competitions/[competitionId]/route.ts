import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ competitionId: string }>;
}

/**
 * GET /api/competitions/[competitionId]
 * Get a specific competition with leaderboard
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { competitionId } = await params;

    const competition = await prisma.competition.findFirst({
      where: {
        id: competitionId,
        householdId: member.householdId,
      },
      include: {
        scores: {
          include: {
            member: {
              select: { id: true, name: true, avatarUrl: true, memberType: true },
            },
          },
          orderBy: { points: "desc" },
        },
      },
    });

    if (!competition) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    return NextResponse.json({ competition });
  } catch (error) {
    return handleApiError(error, { route: "/api/competitions/[competitionId]", method: "GET" });
  }
}

/**
 * PATCH /api/competitions/[competitionId]
 * End a competition (set status to COMPLETED)
 */
export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { competitionId } = await params;

    // Only adults can end competitions
    if (member.memberType !== "ADULT") {
      return NextResponse.json(
        { error: "Solo los adultos pueden finalizar competencias" },
        { status: 403 }
      );
    }

    const competition = await prisma.competition.findFirst({
      where: {
        id: competitionId,
        householdId: member.householdId,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (!competition) {
      return NextResponse.json(
        { error: "Competencia no encontrada o ya finalizada" },
        { status: 404 }
      );
    }

    const updatedCompetition = await prisma.competition.update({
      where: { id: competitionId },
      data: {
        status: "COMPLETED",
        endDate: new Date(),
      },
      include: {
        scores: {
          include: {
            member: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { points: "desc" },
        },
      },
    });

    return NextResponse.json({ competition: updatedCompetition });
  } catch (error) {
    return handleApiError(error, { route: "/api/competitions/[competitionId]", method: "PATCH" });
  }
}

/**
 * DELETE /api/competitions/[competitionId]
 * Cancel a competition
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { competitionId } = await params;

    // Only adults can cancel competitions
    if (member.memberType !== "ADULT") {
      return NextResponse.json(
        { error: "Solo los adultos pueden cancelar competencias" },
        { status: 403 }
      );
    }

    const competition = await prisma.competition.findFirst({
      where: {
        id: competitionId,
        householdId: member.householdId,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (!competition) {
      return NextResponse.json(
        { error: "Competencia no encontrada o ya finalizada" },
        { status: 404 }
      );
    }

    await prisma.competition.update({
      where: { id: competitionId },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/competitions/[competitionId]", method: "DELETE" });
  }
}
