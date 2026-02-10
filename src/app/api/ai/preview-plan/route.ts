import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { generateAIPlan } from "@/lib/llm/ai-planner";
import { isAIEnabled } from "@/lib/llm/provider";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

import type { NextRequest } from "next/server";
import type { MemberType } from "@prisma/client";
import type { ExcludedTask } from "@/lib/plan-duration";

interface PlanAssignment {
  taskName: string;
  memberId: string;
  memberName: string;
  memberType: MemberType;
  reason: string;
  dayOfWeek?: number;
}

interface MemberSummary {
  id: string;
  name: string;
  type: MemberType;
  currentPending: number;
  assignedInPlan: number;
}

interface FairnessDetails {
  adultDistribution: Record<string, number>;
  isSymmetric: boolean;
  maxDifference: number;
}

export interface PlanPreviewResponse {
  plan: {
    id: string;
    assignments: PlanAssignment[];
    balanceScore: number;
    notes: string[];
    durationDays: number;
    excludedTasks: ExcludedTask[];
  };
  members: MemberSummary[];
  fairnessDetails: FairnessDetails;
}

const previewPlanSchema = z.object({
  durationDays: z.number().int().min(1).max(30).default(7),
});

/**
 * POST /api/ai/preview-plan
 * Generate an AI-powered task distribution plan preview without applying it.
 * Returns the plan details for user review before confirmation.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    if (!isAIEnabled()) {
      return NextResponse.json(
        { error: "AI features not configured. Set OPENROUTER_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY or ANTHROPIC_API_KEY." },
        { status: 503 }
      );
    }

    const body: unknown = await request.json();
    const validation = previewPlanSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { durationDays } = validation.data;

    // Generate plan without applying
    const plan = await generateAIPlan(member.householdId, { durationDays });

    if (!plan) {
      return NextResponse.json(
        { error: "No se pudo generar el plan. Verifica que hay tareas y miembros activos." },
        { status: 400 }
      );
    }

    // Get member details for enriching the response
    const members = await prisma.member.findMany({
      where: { householdId: member.householdId, isActive: true },
      include: {
        assignments: {
          where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
          select: { id: true },
        },
      },
    });

    const memberByIdMap = new Map(members.map((m) => [m.id, m]));

    // Enrich assignments with member type, preserving dayOfWeek from AI
    const enrichedAssignments: PlanAssignment[] = plan.assignments
      .filter((a) => memberByIdMap.has(a.memberId))
      .map((a) => {
        const member = memberByIdMap.get(a.memberId)!;
        return {
          taskName: a.taskName,
          memberId: a.memberId,
          memberName: member.name,
          memberType: member.memberType,
          reason: a.reason,
          dayOfWeek: a.dayOfWeek,
        };
      });

    // Count assignments per member in the plan
    const assignmentCounts = new Map<string, number>();
    for (const a of enrichedAssignments) {
      assignmentCounts.set(a.memberId, (assignmentCounts.get(a.memberId) ?? 0) + 1);
    }

    // Build member summaries
    const memberSummaries: MemberSummary[] = members.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.memberType,
      currentPending: m.assignments.length,
      assignedInPlan: assignmentCounts.get(m.id) ?? 0,
    }));

    // Calculate fairness details for adults only
    const adultMembers = members.filter((m) => m.memberType === "ADULT");
    const adultDistribution: Record<string, number> = {};

    for (const adult of adultMembers) {
      adultDistribution[adult.name] = assignmentCounts.get(adult.id) ?? 0;
    }

    const adultCounts = Object.values(adultDistribution);
    const maxCount = Math.max(...adultCounts, 0);
    const minCount = Math.min(...adultCounts, 0);
    const maxDifference = adultCounts.length > 1 ? maxCount - minCount : 0;
    const isSymmetric = maxDifference <= 2;

    const excludedTasks: ExcludedTask[] = plan.excludedTasks ?? [];

    // Expire previous PENDING previews and COMPLETED plans from past cycles
    // (APPLIED plans are handled by apply-plan and should remain until a new plan is applied)
    await prisma.weeklyPlan.updateMany({
      where: {
        householdId: member.householdId,
        status: { in: ["PENDING", "COMPLETED"] },
      },
      data: {
        status: "EXPIRED",
      },
    });

    // Save the new plan to the database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const savedPlan = await prisma.weeklyPlan.create({
      data: {
        householdId: member.householdId,
        status: "PENDING",
        balanceScore: plan.balanceScore,
        notes: plan.notes,
        assignments: JSON.parse(JSON.stringify(enrichedAssignments)),
        durationDays,
        excludedTasks: excludedTasks.length > 0 ? JSON.parse(JSON.stringify(excludedTasks)) : undefined,
        expiresAt,
      },
    });

    const response: PlanPreviewResponse = {
      plan: {
        id: savedPlan.id,
        assignments: enrichedAssignments,
        balanceScore: plan.balanceScore,
        notes: plan.notes,
        durationDays,
        excludedTasks,
      },
      members: memberSummaries,
      fairnessDetails: {
        adultDistribution,
        isSymmetric,
        maxDifference,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/preview-plan", method: "POST" });
  }
}
