import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { respondTransferSchema } from "@/lib/validations/transfer";
import { createNotification } from "@/lib/notification-service";

import type { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ transferId: string }>;
}

/**
 * GET /api/transfers/[transferId]
 * Get a specific transfer
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { transferId } = await params;

    const transfer = await prisma.taskTransfer.findFirst({
      where: {
        id: transferId,
        OR: [{ fromMemberId: member.id }, { toMemberId: member.id }],
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
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transferencia no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ transfer });
  } catch (error) {
    console.error("GET /api/transfers/[transferId] error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error fetching transfer" }, { status: 500 });
  }
}

/**
 * PATCH /api/transfers/[transferId]
 * Accept or reject a transfer (only the recipient can do this)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { transferId } = await params;
    const body: unknown = await request.json();

    const validation = respondTransferSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { action } = validation.data;

    // Get the transfer and verify recipient
    const transfer = await prisma.taskTransfer.findFirst({
      where: {
        id: transferId,
        toMemberId: member.id,
        status: "PENDING",
        assignment: {
          householdId: member.householdId,
        },
      },
      select: { id: true, assignmentId: true },
    });

    if (!transfer) {
      return NextResponse.json(
        { error: "Transferencia no encontrada o no puedes responder a ella" },
        { status: 404 }
      );
    }

    if (action === "ACCEPT") {
      // Update transfer status and reassign the task
      const [updatedTransfer] = await prisma.$transaction([
        prisma.taskTransfer.update({
          where: { id: transferId },
          data: {
            status: "ACCEPTED",
            respondedAt: new Date(),
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
        }),
        prisma.assignment.update({
          where: { id: transfer.assignmentId },
          data: { memberId: member.id },
        }),
      ]);

      // Notify the sender that their transfer was accepted
      await createNotification({
        memberId: updatedTransfer.fromMember.id,
        type: "TRANSFER_ACCEPTED",
        title: "Transferencia aceptada",
        message: `${updatedTransfer.toMember.name} aceptó "${updatedTransfer.assignment.task.name}"`,
        actionUrl: "/my-tasks",
      });

      return NextResponse.json({ transfer: updatedTransfer });
    } else {
      // Reject the transfer
      const updatedTransfer = await prisma.taskTransfer.update({
        where: { id: transferId },
        data: {
          status: "REJECTED",
          respondedAt: new Date(),
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

      // Notify the sender that their transfer was rejected
      await createNotification({
        memberId: updatedTransfer.fromMember.id,
        type: "TRANSFER_REJECTED",
        title: "Transferencia rechazada",
        message: `${updatedTransfer.toMember.name} rechazó "${updatedTransfer.assignment.task.name}"`,
        actionUrl: "/my-tasks",
      });

      return NextResponse.json({ transfer: updatedTransfer });
    }
  } catch (error) {
    console.error("PATCH /api/transfers/[transferId] error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error responding to transfer" }, { status: 500 });
  }
}

/**
 * DELETE /api/transfers/[transferId]
 * Cancel a pending transfer (only the sender can do this)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { transferId } = await params;

    // Verify transfer belongs to sender and is pending
    const transfer = await prisma.taskTransfer.findFirst({
      where: {
        id: transferId,
        fromMemberId: member.id,
        status: "PENDING",
        assignment: {
          householdId: member.householdId,
        },
      },
      select: { id: true },
    });

    if (!transfer) {
      return NextResponse.json(
        { error: "Transferencia no encontrada o no puedes cancelarla" },
        { status: 404 }
      );
    }

    await prisma.taskTransfer.delete({
      where: { id: transferId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/transfers/[transferId] error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error canceling transfer" }, { status: 500 });
  }
}
