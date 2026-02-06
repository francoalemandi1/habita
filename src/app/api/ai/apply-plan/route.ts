import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { computeDueDateForFrequency } from "@/lib/due-date";

import type { NextRequest } from "next/server";
import type { TaskFrequency } from "@prisma/client";

interface AssignmentToApply {
  taskName: string;
  memberName: string;
}

interface ApplyPlanBody {
  planId?: string;
  assignments: AssignmentToApply[];
}

/**
 * POST /api/ai/apply-plan
 * Apply selected assignments from a previewed plan.
 * Only creates assignments that were explicitly selected by the user.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("assignments" in body) ||
      !Array.isArray((body as ApplyPlanBody).assignments)
    ) {
      return NextResponse.json(
        { error: "Invalid request body. Expected { assignments: [...] }" },
        { status: 400 }
      );
    }

    const { assignments, planId } = body as ApplyPlanBody;

    if (assignments.length === 0) {
      return NextResponse.json({
        success: true,
        assignmentsCreated: 0,
        message: "No assignments to apply",
      });
    }

    // Get members and tasks for ID lookup
    const [members, tasks] = await Promise.all([
      prisma.member.findMany({
        where: { householdId: member.householdId, isActive: true },
        select: { id: true, name: true },
      }),
      prisma.task.findMany({
        where: { householdId: member.householdId, isActive: true },
        select: { id: true, name: true, frequency: true },
      }),
    ]);

    const memberMap = new Map(members.map((m) => [m.name.toLowerCase(), m.id]));
    const taskMap = new Map(
      tasks.map((t) => [t.name.toLowerCase(), { id: t.id, frequency: t.frequency }])
    );

    const now = new Date();

    // Look up plan to get expiresAt for due date capping
    let planEndDate: Date | undefined;
    if (planId) {
      const existingPlan = await prisma.weeklyPlan.findUnique({
        where: { id: planId },
        select: { expiresAt: true },
      });
      if (existingPlan) {
        planEndDate = existingPlan.expiresAt;
      }
    }

    // Cancel all pending assignments for the household before applying new plan
    // This ensures the plan replaces previous assignments
    const cancelledCount = await prisma.assignment.updateMany({
      where: {
        householdId: member.householdId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      data: {
        status: "CANCELLED",
      },
    });

    const assignmentsToCreate: Array<{
      taskId: string;
      memberId: string;
      householdId: string;
      dueDate: Date;
      status: "PENDING";
    }> = [];

    const skipped: string[] = [];

    for (const assignment of assignments) {
      const memberId = memberMap.get(assignment.memberName.toLowerCase());
      const taskInfo = taskMap.get(assignment.taskName.toLowerCase());

      if (!memberId || !taskInfo) {
        skipped.push(`${assignment.taskName} → ${assignment.memberName}`);
        continue;
      }

      const dueDate = computeDueDateForFrequency(taskInfo.frequency as TaskFrequency, now, planEndDate);
      assignmentsToCreate.push({
        taskId: taskInfo.id,
        memberId,
        householdId: member.householdId,
        dueDate,
        status: "PENDING",
      });
    }

    if (assignmentsToCreate.length > 0) {
      await prisma.assignment.createMany({
        data: assignmentsToCreate,
      });
    }

    // Update the plan status if planId was provided
    if (planId) {
      await prisma.weeklyPlan.update({
        where: {
          id: planId,
          householdId: member.householdId,
        },
        data: {
          status: "APPLIED",
          appliedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      assignmentsCreated: assignmentsToCreate.length,
      assignmentsCancelled: cancelledCount.count,
      skipped: skipped.length > 0 ? skipped : undefined,
    });
  } catch (error) {
    console.error("POST /api/ai/apply-plan error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Error applying plan" },
      { status: 500 }
    );
  }
}
