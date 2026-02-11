/**
 * Recipe finder LLM pipeline — generates recipe suggestions from available ingredients.
 * Supports multimodal input: text description + images of fridge/pantry.
 * Uses generateObject for structured output (Gemini/Anthropic) or callOpenRouter fallback.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { isAIEnabled, getAIProviderType } from "./provider";

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
  tips: string;
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
    title: z.string().min(1).describe("Nombre de la receta"),
    description: z.string().describe("Descripcion breve de 1-2 oraciones"),
    difficulty: z.enum(["facil", "media", "dificil"]).describe("Nivel de dificultad"),
    prepTimeMinutes: z.number().int().min(5).max(180).describe("Tiempo de preparacion en minutos"),
    servings: z.number().int().min(1).max(20).describe("Cantidad de porciones"),
    ingredients: z.array(z.string()).describe("Lista completa de ingredientes necesarios"),
    missingIngredients: z.array(z.string()).describe("Ingredientes que el usuario NO menciono y necesitaria conseguir"),
    steps: z.array(z.string()).describe("Pasos de preparacion numerados y concretos"),
    tips: z.string().describe("Tip practico o variacion sugerida"),
  })).min(3).max(5),
  summary: z.string().describe("Resumen breve de las sugerencias"),
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

const DIFFICULTY_JSON = '"facil" | "media" | "dificil"';

// ============================================
// Model selection
// ============================================

function getModel(hasImages: boolean): LanguageModel | null {
  const providerType = getAIProviderType();

  if (providerType === "openrouter") {
    return null;
  }

  if (providerType === "gemini") {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    return google(hasImages ? "gemini-2.0-flash" : "gemini-1.5-flash");
  }

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  return anthropic("claude-3-5-haiku-latest");
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

  const providerType = getAIProviderType();
  const prompt = buildPrompt(options);
  const hasImages = options.images.length > 0;

  if (providerType === "openrouter") {
    try {
      return await callOpenRouter(prompt);
    } catch (error) {
      console.error("[recipe-finder] OpenRouter error:", error);
      return null;
    }
  }

  const model = getModel(hasImages);
  if (!model) return null;

  try {
    const messages = buildMessages(prompt, options.images);
    const generated = await generateObject({
      model,
      schema: recipeSchema,
      messages,
    });
    return generated.object;
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

  return `Sos un chef argentino experto en cocina del dia a dia.
El usuario te cuenta que ingredientes tiene disponibles y vos le sugeris recetas concretas.

## Input del usuario
${inputDescription}

## Reglas
- Sugeri entre 3 y 5 recetas CONCRETAS y REALIZABLES con los ingredientes disponibles.
- Solo sugeri recetas que se puedan hacer MAYORMENTE con lo que el usuario tiene.
- Si falta algun ingrediente basico (sal, aceite, pimienta, condimentos comunes), asumi que lo tiene.
- Si falta algo NO basico, listalo en "missingIngredients".
- Adapta las porciones a ${householdSize} persona${householdSize > 1 ? "s" : ""}.
- Prioriza recetas para ${mealLabel}.
- Inclui variedad: una rapida (<20min), una mas elaborada, una saludable.
- Los pasos deben ser concretos y numerados.
- Usa lenguaje coloquial argentino pero claro.
- El campo "tips" debe incluir un consejo practico o variacion posible.
- El "summary" debe ser un resumen breve tipo: "Con lo que tenes, te sugiero estas opciones..."`;
}

// ============================================
// OpenRouter fallback
// ============================================

async function callOpenRouter(
  prompt: string
): Promise<RecipeResult | null> {
  const { OpenRouter } = await import("@openrouter/sdk");
  const client = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

  const result = await client.chat.send({
    chatGenerationParams: {
      model: "openrouter/auto",
      messages: [
        {
          role: "system",
          content: `Eres un chef experto. Responde SOLO con JSON valido siguiendo este schema exacto:
{
  "recipes": [
    {
      "title": "string",
      "description": "string",
      "difficulty": ${DIFFICULTY_JSON},
      "prepTimeMinutes": number (5-180),
      "servings": number (1-20),
      "ingredients": ["string"],
      "missingIngredients": ["string"],
      "steps": ["string"],
      "tips": "string"
    }
  ],
  "summary": "string"
}
Devuelve entre 3 y 5 recetas. NO incluyas texto fuera del JSON.`,
        },
        { role: "user", content: prompt },
      ],
      stream: false,
    },
  });

  const message = result.choices?.[0]?.message;
  const text = typeof message?.content === "string" ? message.content : "{}";

  return parseRecipeJSON(text);
}

// ============================================
// JSON parsing (robust)
// ============================================

/** Parse LLM JSON output with repair for truncated responses. */
function parseRecipeJSON(text: string): RecipeResult | null {
  // Direct parse
  try {
    return JSON.parse(text) as RecipeResult;
  } catch {
    // noop
  }

  // Extract JSON from markdown fences
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as RecipeResult;
    } catch {
      // noop
    }

    // Repair truncated JSON
    try {
      const repaired = repairTruncatedJSON(jsonMatch[0]);
      return JSON.parse(repaired) as RecipeResult;
    } catch {
      // noop
    }
  }

  console.error("[recipe-finder] Failed to parse OpenRouter JSON response");
  return null;
}

/** Repair JSON truncated mid-array or mid-object. */
function repairTruncatedJSON(json: string): string {
  let repaired = json.replace(/,\s*\{[^}]*$/, "");

  const openBraces = (repaired.match(/\{/g) ?? []).length;
  const closeBraces = (repaired.match(/\}/g) ?? []).length;
  const openBrackets = (repaired.match(/\[/g) ?? []).length;
  const closeBrackets = (repaired.match(/\]/g) ?? []).length;

  repaired += "]".repeat(Math.max(0, openBrackets - closeBrackets));
  repaired += "}".repeat(Math.max(0, openBraces - closeBraces));

  return repaired;
}
