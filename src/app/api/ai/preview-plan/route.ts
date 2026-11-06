import { NextResponse, after } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { generatePlanNotes } from "@/lib/llm/ai-planner";
import { isAIEnabled } from "@/lib/llm/provider";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { computeDurationDays, validateDateRange } from "@/lib/plan-duration";
import { tryStartJob, completeJob } from "@/lib/ai-jobs";
import { applyRateLimit } from "@/lib/rate-limit";
import { loadTaskPlannerSnapshot } from "@/lib/task-planner-context";
import { planWeek } from "@habita/domain";

import type { NextRequest } from "next/server";
import type { MemberType } from "@prisma/client";
import type { ExcludedTask } from "@/lib/plan-duration";
import type { AiJobTriggerResponse } from "@habita/contracts";

export const maxDuration = 60;

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
    startDate: string;
    endDate: string;
    excludedTasks: ExcludedTask[];
  };
  members: MemberSummary[];
  fairnessDetails: FairnessDetails;
}

const previewPlanSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

/**
 * POST /api/ai/preview-plan
 * Fire-and-forget: validates input, returns immediately, plan generates in background.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    const limited = await applyRateLimit(request, "ai", member.id);
    if (limited) return limited;

    const body: unknown = await request.json();
    const validation = previewPlanSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { startDate, endDate } = validation.data;

    const dateValidation = validateDateRange(startDate, endDate);
    if (!dateValidation.isValid) {
      return NextResponse.json(
        { error: dateValidation.error ?? "Rango de fechas inválido" },
        { status: 400 }
      );
    }

    const durationDays = computeDurationDays(startDate, endDate);

    const startResult = await tryStartJob({
      householdId: member.householdId,
      memberId: member.id,
      jobType: "PREVIEW_PLAN",
      inputData: { startDate: startDate.toISOString(), endDate: endDate.toISOString(), durationDays },
    });
    if (!startResult.started) {
      const response: AiJobTriggerResponse = {
        started: false,
        alreadyRunning: true,
        jobId: startResult.existingJobId,
      };
      return NextResponse.json(response);
    }

    const jobId = startResult.jobId;

    // Schedule background work
    after(async () => {
      const startTime = Date.now();
      try {
        const snapshot = await loadTaskPlannerSnapshot(member.householdId);

        if (snapshot.members.length === 0 || snapshot.tasks.length === 0) {
          await completeJob(jobId, {
            status: "FAILED",
            errorMessage: "No se pudo generar el plan. Verifica que hay tareas y miembros activos.",
            durationMs: Date.now() - startTime,
          });
          return;
        }

        const plan = planWeek({ snapshot, startDate, durationDays, now: new Date() });

        if (plan.assignments.length === 0) {
          await completeJob(jobId, {
            status: "FAILED",
            errorMessage: "No se pudo generar el plan. Verifica que hay tareas y miembros activos.",
            durationMs: Date.now() - startTime,
          });
          return;
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

        const enrichedAssignments: PlanAssignment[] = plan.assignments
          .filter((a) => memberByIdMap.has(a.memberId))
          .map((a) => {
            const m = memberByIdMap.get(a.memberId)!;
            return {
              taskName: a.taskName,
              memberId: a.memberId,
              memberName: m.name,
              memberType: m.memberType,
              reason: a.reason,
              dayOfWeek: a.dayOfWeek,
            };
          });

        const assignmentCounts = new Map<string, number>();
        for (const a of enrichedAssignments) {
          assignmentCounts.set(a.memberId, (assignmentCounts.get(a.memberId) ?? 0) + 1);
        }

        const memberSummaries: MemberSummary[] = members.map((m) => ({
          id: m.id,
          name: m.name,
          type: m.memberType,
          currentPending: m.assignments.length,
          assignedInPlan: assignmentCounts.get(m.id) ?? 0,
        }));

        const adultMembers = members.filter((m) => m.memberType === "ADULT");
        const adultDistribution: Record<string, number> = {};
        for (const adult of adultMembers) {
          adultDistribution[adult.name] = assignmentCounts.get(adult.id) ?? 0;
        }
        const adultCounts = Object.values(adultDistribution);
        const maxCount = Math.max(...adultCounts, 0);
        const minCount = Math.min(...adultCounts, 0);
        const maxDiff = adultCounts.length > 1 ? maxCount - minCount : 0;

        // Deterministic fairness score: 100 minus a flat penalty per unit of imbalance among adults.
        const balanceScore = Math.max(0, 100 - maxDiff * 15);

        const excludedTasks: ExcludedTask[] = plan.excludedTasks;

        let notes = plan.notes;
        if (isAIEnabled()) {
          try {
            const aiNotes = await generatePlanNotes({ assignments: enrichedAssignments, balanceScore });
            if (aiNotes.length > 0) notes = aiNotes;
          } catch (noteError) {
            console.error("[preview-plan] LLM note generation failed, using template notes:", noteError);
          }
        }

        // Expire previous PENDING previews and COMPLETED plans, then create the new one atomically
        const expiresAt = new Date(endDate);
        expiresAt.setHours(23, 59, 59, 999);

        const savedPlan = await prisma.$transaction(async (tx) => {
          await tx.weeklyPlan.updateMany({
            where: {
              householdId: member.householdId,
              status: { in: ["PENDING", "COMPLETED"] },
            },
            data: { status: "EXPIRED" },
          });

          return tx.weeklyPlan.create({
            data: {
              householdId: member.householdId,
              status: "PENDING",
              balanceScore,
              notes,
              assignments: JSON.parse(JSON.stringify(enrichedAssignments)),
              durationDays,
              startDate,
              excludedTasks: excludedTasks.length > 0 ? JSON.parse(JSON.stringify(excludedTasks)) : undefined,
              expiresAt,
            },
          });
        });

        const resultData: PlanPreviewResponse = {
          plan: {
            id: savedPlan.id,
            assignments: enrichedAssignments,
            balanceScore,
            notes,
            durationDays,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            excludedTasks,
          },
          members: memberSummaries,
          fairnessDetails: {
            adultDistribution,
            isSymmetric: maxDiff <= 2,
            maxDifference: maxDiff,
          },
        };

        await completeJob(jobId, {
          status: "SUCCESS",
          resultData,
          weeklyPlanId: savedPlan.id,
          durationMs: Date.now() - startTime,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[preview-plan] Background job failed:", errorMessage);
        await completeJob(jobId, {
          status: "FAILED",
          errorMessage,
          durationMs: Date.now() - startTime,
        });
      }
    });

    const response: AiJobTriggerResponse = {
      started: true,
      alreadyRunning: false,
      jobId,
    };
    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/preview-plan", method: "POST" });
  }
}
