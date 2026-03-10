import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { isAIEnabled } from "@/lib/llm/provider";
import { generateRecipeSuggestions } from "@/lib/llm/recipe-finder";
import { handleApiError } from "@/lib/api-response";
import { findRunningJob, findRecentSuccessfulJob, markJobRunning, completeJob } from "@/lib/ai-jobs";

import type { NextRequest } from "next/server";
import type { AiJobTriggerResponse } from "@habita/contracts";

export const maxDuration = 60;

// ============================================
// Validation
// ============================================

const MAX_IMAGE_BASE64_SIZE = 1_400_000; // ~1MB decoded

const bodySchema = z.object({
  textInput: z.string().max(2000).default(""),
  images: z.array(z.string()).max(3).default([]),
  mealType: z.enum(["almuerzo", "cena", "libre"]),
});

// ============================================
// POST /api/ai/cocina
// Fire-and-forget: validates input, returns immediately, recipes generate in background.
// ============================================

export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    if (!isAIEnabled()) {
      return NextResponse.json(
        { error: "Las sugerencias de recetas no están configuradas" },
        { status: 503 }
      );
    }

    const body: unknown = await request.json();
    const validation = bodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { textInput, images, mealType } = validation.data;

    if (!textInput.trim() && images.length === 0) {
      return NextResponse.json(
        { error: "Escribí qué ingredientes tenés o adjuntá fotos de tu heladera" },
        { status: 400 }
      );
    }

    for (const img of images) {
      if (img.length > MAX_IMAGE_BASE64_SIZE) {
        return NextResponse.json(
          { error: "Una de las imágenes es demasiado grande. El máximo es 1MB por imagen." },
          { status: 400 }
        );
      }
    }

    // Return cached result for identical text-only requests (12h TTL)
    if (textInput.trim() && images.length === 0) {
      const cached = await findRecentSuccessfulJob(
        member.householdId,
        "COCINA",
        { textInput: textInput.trim(), mealType },
        12 * 60 * 60 * 1000,
      );
      if (cached) {
        const response: AiJobTriggerResponse = {
          started: false,
          alreadyRunning: false,
          jobId: cached.id,
        };
        return NextResponse.json(response);
      }
    }

    // Prevent duplicate concurrent runs
    const existing = await findRunningJob(member.householdId, "COCINA");
    if (existing) {
      const response: AiJobTriggerResponse = {
        started: false,
        alreadyRunning: true,
        jobId: existing.id,
      };
      return NextResponse.json(response);
    }

    const jobId = await markJobRunning(
      member.householdId,
      member.id,
      "COCINA",
      { textInput: textInput.trim(), imageCount: images.length, mealType },
    );

    // Schedule background work
    after(async () => {
      const startTime = Date.now();
      try {
        const householdMembers = await prisma.member.count({
          where: { householdId: member.householdId, isActive: true },
        });

        const result = await generateRecipeSuggestions({
          textInput: textInput.trim(),
          images,
          householdSize: householdMembers,
          mealType,
        });

        if (!result) {
          await completeJob(jobId, {
            status: "FAILED",
            errorMessage: "No se pudieron generar recetas. Intenta de nuevo.",
            durationMs: Date.now() - startTime,
          });
          return;
        }

        await completeJob(jobId, {
          status: "SUCCESS",
          resultData: {
            recipes: result.recipes,
            summary: result.summary,
            generatedAt: new Date().toISOString(),
          },
          durationMs: Date.now() - startTime,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[cocina] Background job failed:", errorMessage);
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
    return handleApiError(error, { route: "/api/ai/cocina", method: "POST" });
  }
}
