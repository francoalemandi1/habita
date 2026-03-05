import { z } from "zod";

export const mealTypeSchema = z.enum(["almuerzo", "cena", "merienda", "libre"]);

export const difficultySchema = z.enum(["facil", "media", "dificil"]);

export const recipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  difficulty: difficultySchema,
  prepTimeMinutes: z.number(),
  servings: z.number(),
  ingredients: z.array(z.string()),
  missingIngredients: z.array(z.string()),
  steps: z.array(z.string()),
  tip: z.string().nullable(),
});

export const cocinaResponseSchema = z.object({
  recipes: z.array(recipeSchema),
  summary: z.string(),
  generatedAt: z.string(),
});

export const cocinaInputSchema = z.object({
  textInput: z.string().min(1),
  mealType: mealTypeSchema,
  images: z.array(z.string()).optional(),
});

export type MealType = z.infer<typeof mealTypeSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type Recipe = z.infer<typeof recipeSchema>;
export type CocinaResponse = z.infer<typeof cocinaResponseSchema>;
export type CocinaInput = z.infer<typeof cocinaInputSchema>;
