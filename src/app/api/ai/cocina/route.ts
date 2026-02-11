import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { isAIEnabled } from "@/lib/llm/provider";
import { generateRecipeSuggestions } from "@/lib/llm/recipe-finder";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

// ============================================
// Validation
// ============================================

const MAX_IMAGE_BASE64_SIZE = 1_400_000; // ~1MB decoded

const bodySchema = z.object({
  textInput: z.string().max(2000).default(""),
  images: z.array(z.string()).max(3).default([]),
  mealType: z.enum(["almuerzo", "cena", "merienda", "libre"]),
});

// ============================================
// POST /api/ai/cocina
// ============================================

export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    if (!isAIEnabled()) {
      return NextResponse.json(
        { error: "Las funciones de IA no estan configuradas" },
        { status: 503 }
      );
    }

    const body: unknown = await request.json();
    const validation = bodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos invalidos" },
        { status: 400 }
      );
    }

    const { textInput, images, mealType } = validation.data;

    // At least one input required
    if (!textInput.trim() && images.length === 0) {
      return NextResponse.json(
        { error: "Escribi que ingredientes tenes o adjunta fotos de tu heladera" },
        { status: 400 }
      );
    }

    // Validate image sizes
    for (const img of images) {
      if (img.length > MAX_IMAGE_BASE64_SIZE) {
        return NextResponse.json(
          { error: "Una de las imagenes es demasiado grande. El maximo es 1MB por imagen." },
          { status: 400 }
        );
      }
    }

    // Get household size
    const householdMembers = await prisma.member.count({
      where: { householdId: member.householdId, isActive: true },
    });

    const result = await generateRecipeSuggestions({
      textInput: textInput.trim(),
      images,
      householdSize: householdMembers,
      mealType,
    });

    if (!result || result.recipes.length === 0) {
      return NextResponse.json(
        { error: "No se pudieron generar recetas. Intenta de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      recipes: result.recipes,
      summary: result.summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/cocina", method: "POST" });
  }
}
