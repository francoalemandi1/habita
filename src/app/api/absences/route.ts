import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { createAbsenceSchema } from "@/lib/validations/preferences";

import type { NextRequest } from "next/server";

/**
 * GET /api/absences
 * Get the current member's absences
 */
export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();
    const includeAll = request.nextUrl.searchParams.get("all") === "true";

    const now = new Date();

    const absences = await prisma.memberAbsence.findMany({
      where: {
        memberId: member.id,
        ...(includeAll ? {} : { endDate: { gte: now } }),
      },
      orderBy: { startDate: "asc" },
      take: 50,
    });

    const current = absences.filter((a) => a.startDate <= now && a.endDate >= now);
    const upcoming = absences.filter((a) => a.startDate > now);

    return NextResponse.json({
      absences,
      current,
      upcoming,
      isCurrentlyAbsent: current.length > 0,
    });
  } catch (error) {
    console.error("GET /api/absences error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error fetching absences" }, { status: 500 });
  }
}

/**
 * POST /api/absences
 * Create a new absence for the current member
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body: unknown = await request.json();

    const validation = createAbsenceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { startDate, endDate, reason } = validation.data;

    // Validate dates
    if (endDate < startDate) {
      return NextResponse.json(
        { error: "La fecha de fin debe ser posterior a la fecha de inicio" },
        { status: 400 }
      );
    }

    const absence = await prisma.memberAbsence.create({
      data: {
        memberId: member.id,
        startDate,
        endDate,
        reason,
      },
    });

    return NextResponse.json({ absence }, { status: 201 });
  } catch (error) {
    console.error("POST /api/absences error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error creating absence" }, { status: 500 });
  }
}
