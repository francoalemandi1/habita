import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { updateAbsenceSchema } from "@/lib/validations/preferences";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ absenceId: string }>;
}

/**
 * PATCH /api/absences/[absenceId]
 * Update an absence
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { absenceId } = await params;
    const body: unknown = await request.json();

    const validation = updateAbsenceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    // Verify absence belongs to member
    const existingAbsence = await prisma.memberAbsence.findFirst({
      where: {
        id: absenceId,
        memberId: member.id,
      },
    });

    if (!existingAbsence) {
      return NextResponse.json({ error: "Ausencia no encontrada" }, { status: 404 });
    }

    const absence = await prisma.memberAbsence.update({
      where: { id: absenceId },
      data: validation.data,
    });

    return NextResponse.json({ absence });
  } catch (error) {
    return handleApiError(error, { route: "/api/absences/[absenceId]", method: "PATCH" });
  }
}

/**
 * DELETE /api/absences/[absenceId]
 * Delete an absence
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { absenceId } = await params;

    // Verify absence belongs to member
    const existingAbsence = await prisma.memberAbsence.findFirst({
      where: {
        id: absenceId,
        memberId: member.id,
      },
    });

    if (!existingAbsence) {
      return NextResponse.json({ error: "Ausencia no encontrada" }, { status: 404 });
    }

    await prisma.memberAbsence.delete({
      where: { id: absenceId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/absences/[absenceId]", method: "DELETE" });
  }
}
