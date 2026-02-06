import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { calculatePlanPerformance, generateAIRewards } from "@/lib/llm/ai-reward-generator";
import { z } from "zod";

import type { NextRequest } from "next/server";

const bodySchema = z.object({
  planId: z.string().min(1),
  force: z.boolean().optional(),
});

/**
 * POST /api/ai/generate-rewards
 * Generate AI-powered rewards based on plan performance.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    if (!isAIEnabled()) {
      return NextResponse.json(
        { error: "AI features not configured" },
        { status: 503 }
      );
    }

    const body: unknown = await request.json();
    const validation = bodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Se requiere planId" },
        { status: 400 }
      );
    }

    const { planId, force } = validation.data;

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
        { error: "Plan no encontrado o no está aplicado" },
        { status: 404 }
      );
    }

    // Check if rewards already exist for this plan
    const existingRewards = await prisma.householdReward.count({
      where: { planId, isAiGenerated: true },
    });

    if (existingRewards > 0 && !force) {
      return NextResponse.json(
        { error: "Ya se generaron recompensas para este plan" },
        { status: 409 }
      );
    }

    // Calculate performance
    const performances = await calculatePlanPerformance(
      member.householdId,
      plan.createdAt,
      plan.expiresAt
    );

    // Require at least one completed task to generate rewards
    const totalCompleted = performances.reduce((sum, p) => sum + p.completedCount, 0);
    if (totalCompleted === 0) {
      return NextResponse.json(
        { error: "No hay tareas completadas. Completa al menos una tarea para generar recompensas." },
        { status: 400 }
      );
    }

    // Delete existing rewards if force regeneration
    if (force && existingRewards > 0) {
      await prisma.householdReward.deleteMany({
        where: { planId, isAiGenerated: true },
      });
    }

    // Generate rewards via AI
    const result = await generateAIRewards(member.householdId, planId, performances);

    if (!result || result.rewards.length === 0) {
      return NextResponse.json(
        { error: "No se pudieron generar recompensas" },
        { status: 500 }
      );
    }

    // Match rewards to member IDs
    const memberMap = new Map(
      performances.map((p) => [p.memberName.toLowerCase(), p])
    );

    // Save rewards to database
    const rewardsToCreate = result.rewards
      .map((reward) => {
        const perf = memberMap.get(reward.memberName.toLowerCase());
        if (!perf) return null;
        return {
          householdId: member.householdId,
          name: reward.rewardName,
          description: reward.rewardDescription,
          pointsCost: reward.pointsCost,
          isAiGenerated: true,
          planId,
          memberId: perf.memberId,
          completionRate: perf.completionRate,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rewardsToCreate.length > 0) {
      await prisma.householdReward.createMany({
        data: rewardsToCreate,
      });
    }

    // Fetch created rewards
    const createdRewards = await prisma.householdReward.findMany({
      where: { planId, isAiGenerated: true },
      orderBy: { completionRate: "desc" },
    });

    return NextResponse.json({
      rewards: createdRewards,
      performances,
    });
  } catch (error) {
    console.error("POST /api/ai/generate-rewards error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Error generando recompensas" },
      { status: 500 }
    );
  }
}
