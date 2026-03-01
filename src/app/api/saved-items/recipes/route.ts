import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { saveRecipeSchema } from "@/lib/validations/saved-items";
import { computeRecipeHash } from "@/lib/content-hash";

/**
 * GET /api/saved-items/recipes
 * List saved recipes for the current member. Order: savedAt DESC.
 */
export async function GET() {
  try {
    const member = await requireMember();

    const savedRecipes = await prisma.savedRecipe.findMany({
      where: { memberId: member.id, householdId: member.householdId },
      orderBy: { savedAt: "desc" },
    });

    return NextResponse.json(savedRecipes);
  } catch (error) {
    return handleApiError(error, { route: "/api/saved-items/recipes", method: "GET" });
  }
}

/**
 * POST /api/saved-items/recipes
 * Save a recipe. Upsert by memberId + contentHash.
 */
export async function POST(request: Request) {
  try {
    const member = await requireMember();
    const body = await request.json();
    const data = saveRecipeSchema.parse(body);

    const contentHash = computeRecipeHash(data.title, data.ingredients);

    const saved = await prisma.savedRecipe.upsert({
      where: {
        memberId_contentHash: {
          memberId: member.id,
          contentHash,
        },
      },
      create: {
        memberId: member.id,
        householdId: member.householdId,
        contentHash,
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        prepTimeMinutes: data.prepTimeMinutes,
        servings: data.servings,
        ingredients: data.ingredients,
        missingIngredients: data.missingIngredients,
        steps: data.steps,
        tip: data.tip ?? null,
      },
      update: {}, // Already saved — no-op
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: "/api/saved-items/recipes", method: "POST" });
  }
}

/**
 * DELETE /api/saved-items/recipes?id=xxx
 * Remove a saved recipe. Verifies ownership.
 */
export async function DELETE(request: Request) {
  try {
    const member = await requireMember();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Falta el parámetro id" }, { status: 400 });
    }

    const existing = await prisma.savedRecipe.findFirst({
      where: { id, memberId: member.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Receta guardada no encontrada" }, { status: 404 });
    }

    await prisma.savedRecipe.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, { route: "/api/saved-items/recipes", method: "DELETE" });
  }
}
