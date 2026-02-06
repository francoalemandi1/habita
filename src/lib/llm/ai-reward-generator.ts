import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAIEnabled, getAIProviderType } from "./provider";

import type { LanguageModel } from "ai";

function getModel(): LanguageModel | null {
  const providerType = getAIProviderType();

  if (providerType === "openrouter") {
    return null;
  }

  if (providerType === "gemini") {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    return google("gemini-1.5-flash");
  }

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  return anthropic("claude-3-5-haiku-latest");
}

const rewardSchema = z.object({
  rewards: z.array(
    z.object({
      memberName: z.string(),
      rewardName: z.string().describe("Nombre corto y divertido de la recompensa"),
      rewardDescription: z.string().describe("Descripción lúdica de la recompensa"),
      pointsCost: z.number().min(0).describe("Costo en puntos basado en rendimiento"),
    })
  ),
});

export type AIRewardResult = z.infer<typeof rewardSchema>;

export interface MemberPerformance {
  memberId: string;
  memberName: string;
  memberType: string;
  assignedCount: number;
  completedCount: number;
  completionRate: number;
  totalPoints: number;
}

/**
 * Calculate performance metrics for each member during a plan period.
 */
export async function calculatePlanPerformance(
  householdId: string,
  planCreatedAt: Date,
  planExpiresAt: Date
): Promise<MemberPerformance[]> {
  const members = await prisma.member.findMany({
    where: { householdId, isActive: true },
    select: { id: true, name: true, memberType: true },
  });

  const performances: MemberPerformance[] = [];

  for (const member of members) {
    const [assigned, completed, points] = await Promise.all([
      prisma.assignment.count({
        where: {
          memberId: member.id,
          householdId,
          createdAt: { gte: planCreatedAt, lte: planExpiresAt },
        },
      }),
      prisma.assignment.count({
        where: {
          memberId: member.id,
          householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
          createdAt: { gte: planCreatedAt, lte: planExpiresAt },
        },
      }),
      prisma.assignment.aggregate({
        where: {
          memberId: member.id,
          householdId,
          status: { in: ["COMPLETED", "VERIFIED"] },
          createdAt: { gte: planCreatedAt, lte: planExpiresAt },
        },
        _sum: { pointsEarned: true },
      }),
    ]);

    performances.push({
      memberId: member.id,
      memberName: member.name,
      memberType: member.memberType,
      assignedCount: assigned,
      completedCount: completed,
      completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
      totalPoints: points._sum.pointsEarned ?? 0,
    });
  }

  return performances;
}

/**
 * Generate AI-powered rewards for members based on their plan performance.
 */
export async function generateAIRewards(
  householdId: string,
  planId: string,
  performances: MemberPerformance[]
): Promise<AIRewardResult | null> {
  if (!isAIEnabled()) {
    return null;
  }

  if (performances.length === 0) {
    return null;
  }

  const providerType = getAIProviderType();

  // Detect household type
  const adultCount = performances.filter((p) => p.memberType === "ADULT").length;
  const childCount = performances.filter((p) => p.memberType !== "ADULT").length;
  const householdType = childCount > 0 ? "familia con hijos" : adultCount <= 2 ? "pareja" : "grupo de adultos";

  const prompt = buildRewardPrompt(performances, householdType);

  if (providerType === "openrouter") {
    try {
      return await generateRewardsOpenRouter(performances, householdType);
    } catch (error) {
      console.error("OpenRouter reward generation error:", error);
      return null;
    }
  }

  const model = getModel();
  if (!model) {
    return null;
  }

  try {
    const result = await generateObject({
      model,
      schema: rewardSchema,
      prompt,
    });
    return result.object;
  } catch (error) {
    console.error("AI reward generation error:", error);
    return null;
  }
}

function buildRewardPrompt(performances: MemberPerformance[], householdType: string): string {
  const performanceInfo = performances
    .map((p) => `- ${p.memberName} (${p.memberType}): ${p.completedCount}/${p.assignedCount} tareas (${p.completionRate}%), ${p.totalPoints} puntos`)
    .join("\n");

  return `Eres un sistema de recompensas gamificado para un hogar de tipo "${householdType}".
Genera recompensas divertidas, lúdicas y personalizadas basadas en el rendimiento de cada miembro.

## Rendimiento del plan
${performanceInfo}

## Instrucciones
1. Genera UNA recompensa para CADA miembro
2. Las recompensas deben ser divertidas y motivadoras (ej: "Rey/Reina del sofá por un día", "Elige la cena", "Día libre de tareas")
3. Miembros con mayor rendimiento reciben recompensas mejores
4. El costo en puntos debe ser proporcional al rendimiento (0 si no completó nada, más alto para quienes más hicieron)
5. Para niños, las recompensas deben ser apropiadas y emocionantes
6. Para parejas, las recompensas pueden ser más creativas y personales
7. Los nombres deben ser cortos y divertidos
8. Las descripciones deben ser motivadoras y celebrar el esfuerzo`;
}

/**
 * OpenRouter fallback for reward generation.
 */
async function generateRewardsOpenRouter(
  performances: MemberPerformance[],
  householdType: string
): Promise<AIRewardResult | null> {
  const { OpenRouter } = await import("@openrouter/sdk");
  const client = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

  const prompt = buildRewardPrompt(performances, householdType);

  const result = await client.chat.send({
    chatGenerationParams: {
      model: "openrouter/auto",
      messages: [
        {
          role: "system",
          content: `Responde SOLO con JSON válido siguiendo este schema:
{
  "rewards": [
    { "memberName": "string", "rewardName": "string", "rewardDescription": "string", "pointsCost": number }
  ]
}`,
        },
        { role: "user", content: prompt },
      ],
      stream: false,
    },
  });

  const message = result.choices?.[0]?.message;
  const text = typeof message?.content === "string" ? message.content : "{}";

  try {
    const parsed = JSON.parse(text) as AIRewardResult;
    return parsed;
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AIRewardResult;
    }
    return null;
  }
}
