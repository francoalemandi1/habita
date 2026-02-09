import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAIEnabled, getAIProviderType } from "./provider";
import { buildRegionalContext } from "./regional-context";

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
      rewardName: z.string().describe("Nombre corto y atractivo de la actividad recomendada"),
      rewardDescription: z.string().describe("Descripción concreta con lugar o actividad específica"),
      pointsCost: z.number().min(0).describe("Costo en puntos basado en rendimiento"),
      category: z.enum(["OUTING", "GASTRONOMY", "OUTDOOR", "HOME"]).describe("Categoría de la recompensa"),
      actionUrl: z.string().nullable().describe("URL real del lugar o actividad, null si no aplica"),
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
  const periodFilter = { gte: planCreatedAt, lte: planExpiresAt };

  // 3 parallel queries instead of 3×M sequential queries
  const [members, assignedByMember, completedByMember] = await Promise.all([
    prisma.member.findMany({
      where: { householdId, isActive: true },
      select: { id: true, name: true, memberType: true },
    }),
    prisma.assignment.groupBy({
      by: ["memberId"],
      where: { householdId, createdAt: periodFilter },
      _count: { id: true },
    }),
    prisma.assignment.groupBy({
      by: ["memberId"],
      where: {
        householdId,
        status: { in: ["COMPLETED", "VERIFIED"] },
        createdAt: periodFilter,
      },
      _count: { id: true },
      _sum: { pointsEarned: true },
    }),
  ]);

  const assignedMap = new Map(assignedByMember.map((a) => [a.memberId, a._count.id]));
  const completedMap = new Map(
    completedByMember.map((c) => [c.memberId, { count: c._count.id, points: c._sum.pointsEarned ?? 0 }])
  );

  return members.map((member) => {
    const assigned = assignedMap.get(member.id) ?? 0;
    const completed = completedMap.get(member.id);
    const completedCount = completed?.count ?? 0;
    const totalPoints = completed?.points ?? 0;

    return {
      memberId: member.id,
      memberName: member.name,
      memberType: member.memberType,
      assignedCount: assigned,
      completedCount,
      completionRate: assigned > 0 ? Math.round((completedCount / assigned) * 100) : 0,
      totalPoints,
    };
  });
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

  // Build regional context for culturally adapted rewards
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { latitude: true, longitude: true, timezone: true, country: true, city: true },
  });
  const regionalContext = await buildRegionalContext(household ?? {});
  const regionalBlock = regionalContext.promptBlock;

  const prompt = buildRewardPrompt(performances, householdType, regionalBlock);

  if (providerType === "openrouter") {
    try {
      return await generateRewardsOpenRouter(performances, householdType, regionalBlock);
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

function buildRewardPrompt(performances: MemberPerformance[], householdType: string, regionalBlock = ""): string {
  const performanceInfo = performances
    .map((p) => `- ${p.memberName} (${p.memberType}): ${p.completedCount}/${p.assignedCount} tareas (${p.completionRate}%), ${p.totalPoints} puntos`)
    .join("\n");

  return `Eres un sistema de recompensas para un hogar de tipo "${householdType}".
Genera actividades CONCRETAS y ACCIONABLES como premio por el rendimiento de cada miembro.

## Rendimiento del plan
${performanceInfo}

## Categorías disponibles
- OUTING: Salidas culturales (cine, teatro, museos, espectáculos)
- GASTRONOMY: Gastronomía (restaurantes, heladerías, cafés, panaderías)
- OUTDOOR: Aire libre (parques, plazas, caminatas, picnic)
- HOME: Hogar (no cocinar, elegir película, día libre de tareas, desayuno en la cama)

## Instrucciones
1. Genera UNA recompensa para CADA miembro
2. Sé ESPECÍFICO: nombrá lugares reales de la ciudad del hogar si tenés información de ubicación
3. Escalá la calidad según rendimiento:
   - >80% completado → actividades premium: salida al cine, restaurante, espectáculo (categoría OUTING o GASTRONOMY)
   - 50-80% completado → actividades intermedias: parque, heladería, café (categoría OUTDOOR o GASTRONOMY)
   - <50% completado → actividades en casa: elegir película, no cocinar, desayuno en la cama (categoría HOME)
4. El costo en puntos debe ser proporcional al rendimiento (0 si no completó nada)
5. Para niños (CHILD): actividades apropiadas y emocionantes (plaza, heladería, película infantil)
6. Incluí una URL real cuando sea posible:
   - Para cine: la cartelera online de la ciudad (ej: cinepolis.com.ar, hoyts.com.ar, cinemark.com.ar)
   - Para restaurantes: URL de Google Maps o del restaurante
   - Para parques/plazas: URL de Google Maps
   - Si no tenés certeza de la URL, poné null
7. Nombres cortos y atractivos (ej: "Noche de cine", "Heladería libre", "Chef libre por un día")
8. Descripciones que mencionen el lugar específico y qué hacer ahí
9. Adaptá las sugerencias al clima y estación actual si hay información disponible${regionalBlock ? `\n\n${regionalBlock}` : ""}`;
}

/**
 * OpenRouter fallback for reward generation.
 */
async function generateRewardsOpenRouter(
  performances: MemberPerformance[],
  householdType: string,
  regionalBlock = ""
): Promise<AIRewardResult | null> {
  const { OpenRouter } = await import("@openrouter/sdk");
  const client = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

  const prompt = buildRewardPrompt(performances, householdType, regionalBlock);

  const result = await client.chat.send({
    chatGenerationParams: {
      model: "openrouter/auto",
      messages: [
        {
          role: "system",
          content: `Responde SOLO con JSON válido siguiendo este schema:
{
  "rewards": [
    { "memberName": "string", "rewardName": "string", "rewardDescription": "string", "pointsCost": number, "category": "OUTING" | "GASTRONOMY" | "OUTDOOR" | "HOME", "actionUrl": "string | null" }
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
