import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { createTransferSchema } from "@/lib/validations/transfer";
import { createNotification } from "@/lib/notification-service";

import type { NextRequest } from "next/server";

/**
 * GET /api/transfers
 * Get transfers for the current member (sent and received)
 */
export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "sent", "received", or null for all

    const whereClause =
      type === "sent"
        ? { fromMemberId: member.id }
        : type === "received"
          ? { toMemberId: member.id }
          : {
              OR: [{ fromMemberId: member.id }, { toMemberId: member.id }],
            };

    const transfers = await prisma.taskTransfer.findMany({
      where: {
        ...whereClause,
        assignment: {
          householdId: member.householdId,
        },
      },
      include: {
        assignment: {
          include: {
            task: { select: { id: true, name: true } },
          },
        },
        fromMember: { select: { id: true, name: true } },
        toMember: { select: { id: true, name: true } },
      },
      orderBy: { requestedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ transfers });
  } catch (error) {
    console.error("GET /api/transfers error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error fetching transfers" }, { status: 500 });
  }
}

/**
 * POST /api/transfers
 * Request a task transfer to another member
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body: unknown = await request.json();

    const validation = createTransferSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { assignmentId, toMemberId, reason } = validation.data;

    // Verify assignment belongs to current member
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        memberId: member.id,
        householdId: member.householdId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      select: { id: true },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Asignación no encontrada o no te pertenece" },
        { status: 404 }
      );
    }

    // Verify target member exists in same household
    const targetMember = await prisma.member.findFirst({
      where: {
        id: toMemberId,
        householdId: member.householdId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: "Miembro destinatario no encontrado" },
        { status: 404 }
      );
    }

    if (targetMember.id === member.id) {
      return NextResponse.json(
        { error: "No puedes transferirte una tarea a ti mismo" },
        { status: 400 }
      );
    }

    // Check if there's already a pending transfer for this assignment
    const existingTransfer = await prisma.taskTransfer.findFirst({
      where: {
        assignmentId,
        status: "PENDING",
      },
      select: { id: true },
    });

    if (existingTransfer) {
      return NextResponse.json(
        { error: "Ya existe una transferencia pendiente para esta tarea" },
        { status: 400 }
      );
    }

    // Create transfer request
    const transfer = await prisma.taskTransfer.create({
      data: {
        assignmentId,
        fromMemberId: member.id,
        toMemberId,
        reason,
      },
      include: {
        assignment: {
          include: {
            task: { select: { id: true, name: true } },
          },
        },
        fromMember: { select: { id: true, name: true } },
        toMember: { select: { id: true, name: true } },
      },
    });

    // Notify the recipient about the transfer request
    await createNotification({
      memberId: toMemberId,
      type: "TRANSFER_REQUEST",
      title: "Solicitud de transferencia",
      message: `${transfer.fromMember.name} quiere transferirte "${transfer.assignment.task.name}"`,
      actionUrl: "/my-tasks",
    });

    return NextResponse.json({ transfer }, { status: 201 });
  } catch (error) {
    console.error("POST /api/transfers error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error creating transfer" }, { status: 500 });
  }
}
