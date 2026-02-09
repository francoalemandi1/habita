import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getCurrentMember } from "@/lib/session";
import { createHouseholdSchema, householdLocationSchema } from "@/lib/validations/household";
import { z } from "zod";

import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

const updateHouseholdSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(50, "Máximo 50 caracteres").optional(),
  location: householdLocationSchema.optional(),
  planningDay: z.number().int().min(0).max(6).nullable().optional(),
});

/**
 * GET /api/households
 * Get the current user's household (if member of one)
 */
export async function GET() {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return NextResponse.json({ household: null });
    }

    return NextResponse.json({ household: member.household });
  } catch (error) {
    console.error("GET /api/households error:", error);
    return NextResponse.json(
      { error: "Error fetching household" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/households
 * Create a new household and add the current user as the first member
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body: unknown = await request.json();

    const validation = createHouseholdSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name } = validation.data;

    // Check if user already has a household
    const existingMember = await getCurrentMember();
    if (existingMember) {
      return NextResponse.json(
        { error: "Ya eres miembro de un hogar" },
        { status: 400 }
      );
    }

    // Get user info for member name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Create household and member in a transaction
    const household = await prisma.$transaction(async (tx) => {
      const newHousehold = await tx.household.create({
        data: { name },
      });

      await tx.member.create({
        data: {
          userId,
          householdId: newHousehold.id,
          name: user?.name ?? "Usuario",
          memberType: "ADULT",
        },
      });

      // Create initial MemberLevel
      const member = await tx.member.findFirst({
        where: { userId, householdId: newHousehold.id },
      });

      if (member) {
        await tx.memberLevel.create({
          data: { memberId: member.id },
        });
      }

      return newHousehold;
    });

    return NextResponse.json({ household }, { status: 201 });
  } catch (error) {
    console.error("POST /api/households error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Error creating household" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/households
 * Update the current household's name
 */
export async function PATCH(request: NextRequest) {
  try {
    await requireAuth();
    const member = await getCurrentMember();

    if (!member) {
      return NextResponse.json({ error: "No member found" }, { status: 404 });
    }

    if (member.memberType !== "ADULT") {
      return NextResponse.json({ error: "Solo adultos pueden editar el hogar" }, { status: 403 });
    }

    const body: unknown = await request.json();
    const validation = updateHouseholdSchema.safeParse(body);

    if (!validation.success) {
      const message = validation.error.errors[0]?.message ?? "Datos inválidos";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const updateData: Prisma.HouseholdUpdateInput = {};
    if (validation.data.name) {
      updateData.name = validation.data.name;
    }
    if (validation.data.location) {
      const loc = validation.data.location;
      if (loc.latitude != null) updateData.latitude = loc.latitude;
      if (loc.longitude != null) updateData.longitude = loc.longitude;
      if (loc.timezone) updateData.timezone = loc.timezone;
      if (loc.country) updateData.country = loc.country;
      if (loc.city) updateData.city = loc.city;
    }
    if (validation.data.planningDay !== undefined) {
      updateData.planningDay = validation.data.planningDay;
    }

    const updated = await prisma.household.update({
      where: { id: member.householdId },
      data: updateData,
    });

    return NextResponse.json({ household: updated });
  } catch (error) {
    console.error("PATCH /api/households error:", error);
    return NextResponse.json(
      { error: "Error al actualizar el hogar" },
      { status: 500 }
    );
  }
}
