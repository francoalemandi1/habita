import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { createCompetitionSchema } from "@/lib/validations/competition";

import type { NextRequest } from "next/server";

function calculateEndDate(duration: "WEEK" | "MONTH" | "CUSTOM", customEndDate?: string): Date {
  const now = new Date();

  switch (duration) {
    case "WEEK":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "MONTH":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case "CUSTOM":
      if (customEndDate) {
        return new Date(customEndDate);
      }
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}

/**
 * GET /api/competitions
 * Get competitions for the household
 */
export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const whereClause: { householdId: string; status?: "ACTIVE" | "COMPLETED" | "CANCELLED" } = {
      householdId: member.householdId,
    };

    if (status === "ACTIVE" || status === "COMPLETED" || status === "CANCELLED") {
      whereClause.status = status;
    }

    const competitions = await prisma.competition.findMany({
      where: whereClause,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ competitions });
  } catch (error) {
    console.error("GET /api/competitions error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error fetching competitions" }, { status: 500 });
  }
}

/**
 * POST /api/competitions
 * Create a new competition
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    // Only adults can create competitions
    if (member.memberType !== "ADULT") {
      return NextResponse.json(
        { error: "Solo los adultos pueden crear competencias" },
        { status: 403 }
      );
    }

    // Check if there's already an active competition
    const activeCompetition = await prisma.competition.findFirst({
      where: {
        householdId: member.householdId,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (activeCompetition) {
      return NextResponse.json(
        { error: "Ya existe una competencia activa" },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const validation = createCompetitionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name, description, duration, prize, customEndDate } = validation.data;
    const endDate = calculateEndDate(duration, customEndDate);

    // Get all household members to initialize scores
    const members = await prisma.member.findMany({
      where: {
        householdId: member.householdId,
        isActive: true,
      },
      select: { id: true },
    });

    const competition = await prisma.competition.create({
      data: {
        householdId: member.householdId,
        name,
        description,
        duration,
        prize,
        endDate,
        scores: {
          create: members.map((m) => ({
            memberId: m.id,
            points: 0,
            tasksCompleted: 0,
          })),
        },
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

    return NextResponse.json({ competition }, { status: 201 });
  } catch (error) {
    console.error("POST /api/competitions error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error creating competition" }, { status: 500 });
  }
}
