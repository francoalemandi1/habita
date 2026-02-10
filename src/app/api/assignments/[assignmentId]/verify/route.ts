import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { z } from "zod";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ assignmentId: string }>;
}

const verifySchema = z.object({
  approved: z.boolean(),
  feedback: z.string().max(500).optional(),
});

/**
 * POST /api/assignments/[assignmentId]/verify
 * Verify (approve or reject) a completed task.
 * Only adults can verify tasks completed by children/teens.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { assignmentId } = await params;
    const body: unknown = await request.json();

    // Only adults can verify
    if (member.memberType !== "ADULT") {
      return NextResponse.json(
        { error: "Solo los adultos pueden verificar tareas" },
        { status: 403 }
      );
    }

    const validation = verifySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { approved, feedback } = validation.data;

    // Get the assignment
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        householdId: member.householdId,
        status: "COMPLETED",
      },
      include: {
        member: {
          select: { id: true, memberType: true },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Asignación no encontrada o no está completada" },
        { status: 404 }
      );
    }

    // Can only verify tasks from children/teens
    if (assignment.member.memberType === "ADULT") {
      return NextResponse.json(
        { error: "No se pueden verificar tareas de adultos" },
        { status: 400 }
      );
    }

    if (approved) {
      // Mark as verified
      await prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          status: "VERIFIED",
          notes: feedback ? `Verificado: ${feedback}` : "Verificado por adulto",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Tarea verificada correctamente",
        status: "VERIFIED",
      });
    } else {
      // Reject - reset assignment and remove XP in a single transaction
      await prisma.$transaction(async (tx) => {
        await tx.assignment.update({
          where: { id: assignmentId },
          data: {
            status: "PENDING",
            completedAt: null,
            pointsEarned: null,
            notes: feedback ? `Rechazado: ${feedback}` : "Rechazado - debe rehacerse",
          },
        });

        if (assignment.pointsEarned) {
          await tx.memberLevel.update({
            where: { memberId: assignment.memberId },
            data: {
              xp: { decrement: assignment.pointsEarned },
            },
          });
        }
      });

      return NextResponse.json({
        success: true,
        message: "Tarea rechazada y devuelta a pendiente",
        status: "PENDING",
      });
    }
  } catch (error) {
    return handleApiError(error, { route: "/api/assignments/[assignmentId]/verify", method: "POST" });
  }
}
