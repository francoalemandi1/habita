import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";

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
    console.error("GET /api/competitions/[id] error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error fetching competition" }, { status: 500 });
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
    console.error("PATCH /api/competitions/[id] error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error ending competition" }, { status: 500 });
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
    console.error("DELETE /api/competitions/[id] error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error cancelling competition" }, { status: 500 });
  }
}
