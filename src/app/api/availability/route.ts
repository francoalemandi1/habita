import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { availabilitySlotsSchema } from "@/lib/validations/member";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

/**
 * GET /api/availability
 * Get the current member's availability slots
 */
export async function GET() {
  try {
    const member = await requireMember();

    const data = await prisma.member.findUnique({
      where: { id: member.id },
      select: { availabilitySlots: true },
    });

    return NextResponse.json({ availabilitySlots: data?.availabilitySlots ?? null });
  } catch (error) {
    return handleApiError(error, { route: "/api/availability", method: "GET" });
  }
}

/**
 * PUT /api/availability
 * Update the current member's availability slots
 */
export async function PUT(request: NextRequest) {
  try {
    const member = await requireMember();
    const body: unknown = await request.json();

    // Allow null to reset availability
    if (body === null) {
      await prisma.member.update({
        where: { id: member.id },
        data: { availabilitySlots: Prisma.JsonNull },
      });
      return NextResponse.json({ availabilitySlots: null });
    }

    const validation = availabilitySlotsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { weekday, weekend, notes } = validation.data;

    // If no slots selected, reset to null
    const isEmpty = weekday.length === 0 && weekend.length === 0 && !notes;

    await prisma.member.update({
      where: { id: member.id },
      data: { availabilitySlots: isEmpty ? Prisma.JsonNull : { weekday, weekend, notes } },
    });

    const availabilitySlots = isEmpty ? null : { weekday, weekend, notes };

    return NextResponse.json({ availabilitySlots });
  } catch (error) {
    return handleApiError(error, { route: "/api/availability", method: "PUT" });
  }
}
