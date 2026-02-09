import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";

import type { NextRequest } from "next/server";
import type { MemberType } from "@prisma/client";

interface PlanAssignment {
  taskName: string;
  memberId: string;
  memberName: string;
  memberType: MemberType;
  reason: string;
}

interface PatchBody {
  action: "add" | "remove" | "reassign";
  taskName: string;
  memberId: string;
  newMemberId?: string;
}

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

    if (
      typeof body !== "object" ||
      body === null ||
      !("action" in body) ||
      !("taskName" in body) ||
      !("memberId" in body)
    ) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { action, taskName, memberId: targetMemberId, newMemberId } = body as PatchBody;

    if (!["add", "remove", "reassign"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Expected: add, remove, reassign" },
        { status: 400 }
      );
    }

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
      // Create a real assignment
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const dueDate = plan.expiresAt < endOfDay ? plan.expiresAt : endOfDay;

      await prisma.assignment.create({
        data: {
          taskId: targetTask.id,
          memberId: targetMember.id,
          householdId: member.householdId,
          dueDate,
          status: "PENDING",
        },
      });

      // Update plan JSON
      const updatedAssignments: PlanAssignment[] = [
        ...planAssignments,
        {
          taskName,
          memberId: targetMember.id,
          memberName: targetMember.name,
          memberType: targetMember.memberType,
          reason: "Agregada manualmente",
        },
      ];

      await prisma.weeklyPlan.update({
        where: { id: planId },
        data: { assignments: updatedAssignments as never },
      });

      return NextResponse.json({ success: true, action: "add" });
    }

    if (action === "remove") {
      // Cancel the matching assignment
      const existingAssignment = await prisma.assignment.findFirst({
        where: {
          taskId: targetTask.id,
          memberId: targetMember.id,
          householdId: member.householdId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      });

      if (existingAssignment) {
        await prisma.assignment.update({
          where: { id: existingAssignment.id },
          data: { status: "CANCELLED" },
        });
      }

      // Update plan JSON
      const updatedAssignments = planAssignments.filter(
        (a) =>
          !(
            a.taskName.toLowerCase() === taskName.toLowerCase() &&
            a.memberId === targetMemberId
          )
      );

      await prisma.weeklyPlan.update({
        where: { id: planId },
        data: { assignments: updatedAssignments as never },
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

      // Cancel old assignment
      const oldAssignment = await prisma.assignment.findFirst({
        where: {
          taskId: targetTask.id,
          memberId: targetMember.id,
          householdId: member.householdId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      });

      if (oldAssignment) {
        await prisma.assignment.update({
          where: { id: oldAssignment.id },
          data: { status: "CANCELLED" },
        });
      }

      // Create new assignment
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const dueDate = plan.expiresAt < endOfDay ? plan.expiresAt : endOfDay;

      await prisma.assignment.create({
        data: {
          taskId: targetTask.id,
          memberId: newMember.id,
          householdId: member.householdId,
          dueDate,
          status: "PENDING",
        },
      });

      // Update plan JSON
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

      await prisma.weeklyPlan.update({
        where: { id: planId },
        data: { assignments: updatedAssignments as never },
      });

      return NextResponse.json({ success: true, action: "reassign" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/plans/[planId]/assignments error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Error modifying plan assignment" },
      { status: 500 }
    );
  }
}
