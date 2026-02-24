/**
 * Recipe finder LLM pipeline — generates recipe suggestions from available ingredients.
 * Supports multimodal input: text description + images of fridge/pantry.
 * Uses DeepSeek for text-only, Gemini for multimodal (images).
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { isAIEnabled } from "./provider";
import { getDeepSeekModel } from "./deepseek-provider";

import type { LanguageModel } from "ai";

// ============================================
// Types
// ============================================

export interface Recipe {
  title: string;
  description: string;
  difficulty: "facil" | "media" | "dificil";
  prepTimeMinutes: number;
  servings: number;
  ingredients: string[];
  missingIngredients: string[];
  steps: string[];
  tip: string | null;
}

export interface RecipeResult {
  recipes: Recipe[];
  summary: string;
}

export type MealType = "almuerzo" | "cena" | "merienda" | "libre";

export interface RecipeFinderOptions {
  textInput: string;
  images: string[];
  householdSize: number;
  mealType: MealType;
}

// ============================================
// Schema
// ============================================

const recipeSchema = z.object({
  recipes: z.array(z.object({
    title: z.string().min(1),
    description: z.string(),
    difficulty: z.enum(["facil", "media", "dificil"]),
    prepTimeMinutes: z.number().int().min(5).max(180),
    servings: z.number().int().min(1).max(20),
    ingredients: z.array(z.string()),
    missingIngredients: z.array(z.string()),
    steps: z.array(z.string()),
    tip: z.string().optional(),
  })).min(3).max(5),
  summary: z.string(),
});

// ============================================
// Constants
// ============================================

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  almuerzo: "almuerzo",
  cena: "cena",
  merienda: "merienda",
  libre: "cualquier momento del dia",
};

// ============================================
// Model selection
// ============================================

function getModel(hasImages: boolean): LanguageModel {
  if (hasImages) {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    return google("gemini-2.0-flash");
  }

  return getDeepSeekModel();
}

// ============================================
// Main function
// ============================================

/**
 * Generate recipe suggestions based on user-provided ingredients (text + images).
 * Returns null if AI is not enabled or generation fails.
 */
export async function generateRecipeSuggestions(
  options: RecipeFinderOptions
): Promise<RecipeResult | null> {
  if (!isAIEnabled()) {
    return null;
  }

  const prompt = buildPrompt(options);
  const hasImages = options.images.length > 0;
  const model = getModel(hasImages);

  try {
    const messages = buildMessages(prompt, options.images);
    const generated = await generateObject({
      model,
      schema: recipeSchema,
      messages,
    });
    // Map optional tip to nullable for consistent downstream handling
    return {
      summary: generated.object.summary,
      recipes: generated.object.recipes.map((r) => ({
        ...r,
        tip: r.tip ?? null,
      })),
    };
  } catch (error) {
    console.error("[recipe-finder] AI error:", error);
    return null;
  }
}

// ============================================
// Message builder (multimodal support)
// ============================================

function buildMessages(prompt: string, images: string[]) {
  if (images.length === 0) {
    return [{ role: "user" as const, content: prompt }];
  }

  const imageParts = images.map((img) => ({
    type: "image" as const,
    image: img,
  }));

  return [
    {
      role: "user" as const,
      content: [
        ...imageParts,
        { type: "text" as const, text: prompt },
      ],
    },
  ];
}

// ============================================
// Prompt builder
// ============================================

function buildPrompt(options: RecipeFinderOptions): string {
  const { textInput, images, householdSize, mealType } = options;
  const mealLabel = MEAL_TYPE_LABELS[mealType];

  const inputDescription = images.length > 0
    ? textInput
      ? `El usuario te dice: "${textInput}"\nAdemas, adjunto ${images.length} foto(s) de su heladera/alacena. Identifica los ingredientes visibles en las fotos y combinalos con lo que menciona en el texto.`
      : `El usuario adjunto ${images.length} foto(s) de su heladera/alacena. Identifica todos los ingredientes visibles en las fotos.`
    : `El usuario te dice: "${textInput}"`;

  return `## Rol

Sos un chef argentino experto en cocina del dia a dia.
El usuario te cuenta que ingredientes tiene y vos le sugeris recetas concretas.

## Input del usuario

${inputDescription}

## Reglas estrictas

- Sugeri entre 3 y 5 recetas CONCRETAS y REALIZABLES con los ingredientes disponibles.
- Solo sugeri recetas que se puedan hacer MAYORMENTE con lo que el usuario tiene.
- NO inventes ingredientes que el usuario no menciono ni se ven en las fotos.
- Si falta un ingrediente basico (sal, aceite, pimienta, condimentos comunes), asumi que lo tiene.
- Si falta algo NO basico, listalo en "missingIngredients".
- Adapta las porciones a ${householdSize} persona${householdSize > 1 ? "s" : ""}.
- Prioriza recetas para ${mealLabel}.
- Inclui variedad: al menos una rapida (<20min), una mas elaborada, una saludable.

## Tono de redaccion

- Concreto y directo. "Pollo al horno con papas y romero" — NO "Una deliciosa receta ideal para compartir en familia".
- Prohibido: "delicioso/a", "ideal para", "perfecto/a para", "nutritivo y sabroso", "una opcion", "clasico/a que nunca falla".
- Lenguaje coloquial argentino pero claro.

## Guia de campos

- **title**: nombre concreto de la receta. "Pollo al verdeo con arroz", no "Receta de pollo".
- **description**: 1-2 oraciones. Que la distingue de las otras recetas que sugeris (ingrediente estrella, tecnica, resultado). NO repetir el titulo.
- **difficulty**: "facil" (sin tecnica, pocos pasos), "media" (algo de tecnica o tiempo), "dificil" (tecnica especifica o muchos pasos).
- **prepTimeMinutes**: tiempo total realista incluyendo coccion.
- **servings**: adaptado a ${householdSize} persona${householdSize > 1 ? "s" : ""}.
- **ingredients**: lista completa con cantidades. "2 pechugas de pollo", no solo "pollo".
- **missingIngredients**: solo lo que el usuario NO tiene y necesita comprar. Si no falta nada, array vacio.
- **steps**: concretos y accionables. "Cortar el pollo en cubos de 2cm", no "Preparar el pollo".
- **tip** (opcional): solo si hay una sustitucion util, tecnica clave o variacion concreta. "Si no tenes romero, funciona con oregano". Omitir si no hay un tip genuino — NO inventar tips genericos como "Servir caliente" o "Acompañar con ensalada".
- **summary**: 1 oracion que resuma las opciones. "Con pollo, arroz y verduras tenes para una rapida, un guiso y una ensalada tibia."`;
}

