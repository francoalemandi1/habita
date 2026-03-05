import { z } from "zod";
import { searchItemSchema } from "./shopping-plan";

export const saveCartInputSchema = z.object({
  storeName: z.string().min(1).max(200),
  searchTerms: z.array(z.string().min(1)).min(1).max(50),
  searchItems: z.array(searchItemSchema).optional(),
  products: z.array(z.record(z.unknown())).min(1).max(100),
  totalPrice: z.number().min(0),
  cheapestCount: z.number().int().min(0).default(0),
  missingTerms: z.array(z.string()).default([]),
  totalSearched: z.number().int().min(0).default(0),
});

export const savedCartSchema = z.object({
  id: z.string(),
  storeName: z.string(),
  searchTerms: z.array(z.string()),
  products: z.array(z.record(z.unknown())),
  totalPrice: z.number(),
  cheapestCount: z.number().int().nonnegative(),
  missingTerms: z.array(z.string()),
  totalSearched: z.number().int().nonnegative(),
  savedAt: z.string(),
});

export const refreshSavedCartInputSchema = z.object({
  savedCartId: z.string().min(1),
});

// ============================================
// Saved events
// ============================================

export const saveEventInputSchema = z.object({
  culturalEventId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string(),
  startDate: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  priceRange: z.string(),
  sourceUrl: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  artists: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  culturalCategory: z.string().nullable().optional(),
  highlightReason: z.string().nullable().optional(),
  ticketUrl: z.string().nullable().optional(),
  bookingUrl: z.string().nullable().optional(),
  dateInfo: z.string().nullable().optional(),
});

export const savedEventSchema = z.object({
  id: z.string(),
  culturalEventId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  startDate: z.string().nullable(),
  venueName: z.string().nullable(),
  address: z.string().nullable(),
  priceRange: z.string(),
  sourceUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  artists: z.array(z.string()),
  tags: z.array(z.string()),
  culturalCategory: z.string().nullable(),
  highlightReason: z.string().nullable(),
  ticketUrl: z.string().nullable(),
  bookingUrl: z.string().nullable(),
  dateInfo: z.string().nullable(),
  savedAt: z.string(),
});

// ============================================
// Saved recipes
// ============================================

export const saveRecipeInputSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  difficulty: z.enum(["facil", "media", "dificil"]),
  prepTimeMinutes: z.number(),
  servings: z.number(),
  ingredients: z.array(z.string()),
  missingIngredients: z.array(z.string()).optional(),
  steps: z.array(z.string()),
  tip: z.string().nullable().optional(),
});

export const savedRecipeSchema = z.object({
  id: z.string(),
  contentHash: z.string(),
  title: z.string(),
  description: z.string(),
  difficulty: z.string(),
  prepTimeMinutes: z.number(),
  servings: z.number(),
  ingredients: z.array(z.string()),
  missingIngredients: z.array(z.string()),
  steps: z.array(z.string()),
  tip: z.string().nullable(),
  savedAt: z.string(),
});

// ============================================
// Inferred types
// ============================================

export type SaveCartInput = z.infer<typeof saveCartInputSchema>;
export type SavedCart = z.infer<typeof savedCartSchema>;
export type RefreshSavedCartInput = z.infer<typeof refreshSavedCartInputSchema>;
export type SaveEventInput = z.infer<typeof saveEventInputSchema>;
export type SavedEvent = z.infer<typeof savedEventSchema>;
export type SaveRecipeInput = z.infer<typeof saveRecipeInputSchema>;
export type SavedRecipe = z.infer<typeof savedRecipeSchema>;
