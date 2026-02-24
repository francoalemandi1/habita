import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";
import { z } from "zod";

import type { NextRequest } from "next/server";
import type { MemberType } from "@prisma/client";

interface PlanAssignment {
  taskName: string;
  memberId: string;
  memberName: string;
  memberType: MemberType;
  reason: string;
  dayOfWeek?: number;
}

const patchAssignmentSchema = z.object({
  action: z.enum(["add", "remove", "reassign"]),
  taskName: z.string().min(1).max(200),
  memberId: z.string().min(1),
  newMemberId: z.string().min(1).optional(),
  dayOfWeek: z.number().int().min(1).max(7).optional(),
});

/**
 * PATCH /api/plans/[planId]/assignments
 * Modify assignments in an APPLIED plan.
 * Actions: add, remove, reassign.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const member = await requireMember();
    const { planId } = await params;

    const body: unknown = await request.json();
    const validation = patchAssignmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { action, taskName, memberId: targetMemberId, newMemberId, dayOfWeek } = validation.data;

    // Verify plan belongs to household and is APPLIED
    const plan = await prisma.weeklyPlan.findFirst({
      where: {
        id: planId,
        householdId: member.householdId,
        status: "APPLIED",
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found or not applied" },
        { status: 404 }
      );
    }

    const planAssignments = (plan.assignments as unknown as PlanAssignment[]) ?? [];

    // Resolve IDs
    const householdMembers = await prisma.member.findMany({
      where: { householdId: member.householdId, isActive: true },
      select: { id: true, name: true, memberType: true },
    });
    const householdTasks = await prisma.task.findMany({
      where: { householdId: member.householdId, isActive: true },
      select: { id: true, name: true },
    });

    const memberById = new Map(householdMembers.map((m) => [m.id, m]));
    const taskByName = new Map(householdTasks.map((t) => [t.name.toLowerCase(), t]));

    const targetMember = memberById.get(targetMemberId);
    const targetTask = taskByName.get(taskName.toLowerCase());

    if (!targetMember) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }
    if (!targetTask) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    if (action === "add") {
      // Skip if a pending assignment already exists for this task + member
      const existingAssignment = await prisma.assignment.findFirst({
        where: {
          taskId: targetTask.id,
          memberId: targetMember.id,
          householdId: member.householdId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      });

      if (existingAssignment) {
        return NextResponse.json({ success: true, action: "add" });
      }

      let dueDate: Date;
      if (dayOfWeek) {
        // Derive startDate: expiresAt is startDate + durationDays - 1
        const planStart = new Date(plan.expiresAt);
        planStart.setDate(planStart.getDate() - (plan.durationDays - 1));
        planStart.setHours(0, 0, 0, 0);
        dueDate = new Date(planStart);
        dueDate.setDate(dueDate.getDate() + dayOfWeek - 1);
        dueDate.setHours(23, 59, 59, 999);
        const now = new Date();
        if (dueDate < now) {
          dueDate = new Date();
          dueDate.setHours(23, 59, 59, 999);
        }
      } else {
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        dueDate = plan.expiresAt < endOfDay ? plan.expiresAt : endOfDay;
      }

      const updatedAssignments: PlanAssignment[] = [
        ...planAssignments,
        {
          taskName,
          memberId: targetMember.id,
          memberName: targetMember.name,
          memberType: targetMember.memberType,
          reason: "Agregada manualmente",
          dayOfWeek,
        },
      ];

      await prisma.$transaction(async (tx) => {
        await tx.assignment.create({
          data: {
            taskId: targetTask.id,
            memberId: targetMember.id,
            householdId: member.householdId,
            dueDate,
            status: "PENDING",
          },
        });
        await tx.weeklyPlan.update({
          where: { id: planId },
          data: { assignments: updatedAssignments as never },
        });
      });

      return NextResponse.json({ success: true, action: "add" });
    }

    if (action === "remove") {
      const updatedAssignments = planAssignments.filter(
        (a) =>
          !(
            a.taskName.toLowerCase() === taskName.toLowerCase() &&
            a.memberId === targetMemberId
          )
      );

      await prisma.$transaction(async (tx) => {
        const existingAssignment = await tx.assignment.findFirst({
          where: {
            taskId: targetTask.id,
            memberId: targetMember.id,
            householdId: member.householdId,
            status: { in: ["PENDING", "IN_PROGRESS"] },
          },
        });

        if (existingAssignment) {
          await tx.assignment.update({
            where: { id: existingAssignment.id },
            data: { status: "CANCELLED" },
          });

          // Reject pending transfers for the cancelled assignment
          await tx.taskTransfer.updateMany({
            where: { assignmentId: existingAssignment.id, status: "PENDING" },
            data: { status: "REJECTED", respondedAt: new Date() },
          });

        }

        await tx.weeklyPlan.update({
          where: { id: planId },
          data: { assignments: updatedAssignments as never },
        });
      });

      return NextResponse.json({ success: true, action: "remove" });
    }

    if (action === "reassign") {
      if (!newMemberId) {
        return NextResponse.json(
          { error: "newMemberId is required for reassign" },
          { status: 400 }
        );
      }

      const newMember = memberById.get(newMemberId);
      if (!newMember) {
        return NextResponse.json(
          { error: "Nuevo miembro no encontrado" },
          { status: 404 }
        );
      }

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const dueDate = plan.expiresAt < endOfDay ? plan.expiresAt : endOfDay;

      const updatedAssignments = planAssignments.map((a) => {
        if (
          a.taskName.toLowerCase() === taskName.toLowerCase() &&
          a.memberId === targetMemberId
        ) {
          return {
            ...a,
            memberId: newMember.id,
            memberName: newMember.name,
            memberType: newMember.memberType,
            reason: `Reasignada manualmente`,
          };
        }
        return a;
      });

      await prisma.$transaction(async (tx) => {
        const oldAssignment = await tx.assignment.findFirst({
          where: {
            taskId: targetTask.id,
            memberId: targetMember.id,
            householdId: member.householdId,
            status: { in: ["PENDING", "IN_PROGRESS"] },
          },
        });

        if (oldAssignment) {
          await tx.assignment.update({
            where: { id: oldAssignment.id },
            data: { status: "CANCELLED" },
          });

          // Reject pending transfers for the cancelled assignment
          await tx.taskTransfer.updateMany({
            where: { assignmentId: oldAssignment.id, status: "PENDING" },
            data: { status: "REJECTED", respondedAt: new Date() },
          });

        }

        await tx.assignment.create({
          data: {
            taskId: targetTask.id,
            memberId: newMember.id,
            householdId: member.householdId,
            dueDate,
            status: "PENDING",
          },
        });

        await tx.weeklyPlan.update({
          where: { id: planId },
          data: { assignments: updatedAssignments as never },
        });
      });

      return NextResponse.json({ success: true, action: "reassign" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, { route: "/api/plans/[planId]/assignments", method: "PATCH" });
  }
}
