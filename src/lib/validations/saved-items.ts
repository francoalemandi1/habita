import { z } from "zod";

// ============================================
// SavedEvent
// ============================================

export const saveEventSchema = z.object({
  culturalEventId: z.string().min(1).optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  category: z.string().min(1).max(50),
  startDate: z.string().datetime().nullable().optional(),
  venueName: z.string().max(300).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  priceRange: z.string().max(200),
  sourceUrl: z.string().url().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  artists: z.array(z.string()).max(50).default([]),
  tags: z.array(z.string()).max(50).default([]),
  culturalCategory: z.string().max(100).nullable().optional(),
  highlightReason: z.string().max(500).nullable().optional(),
  ticketUrl: z.string().url().nullable().optional(),
  bookingUrl: z.string().url().nullable().optional(),
  dateInfo: z.string().max(200).nullable().optional(),
});

export type SaveEventInput = z.infer<typeof saveEventSchema>;

// ============================================
// SavedRecipe
// ============================================

export const saveRecipeSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(2000),
  difficulty: z.enum(["facil", "media", "dificil"]),
  prepTimeMinutes: z.number().int().min(1).max(600),
  servings: z.number().int().min(1).max(50),
  ingredients: z.array(z.string().min(1)).min(1).max(100),
  missingIngredients: z.array(z.string()).max(100).default([]),
  steps: z.array(z.string().min(1)).min(1).max(50),
  tip: z.string().max(1000).nullable().optional(),
});

export type SaveRecipeInput = z.infer<typeof saveRecipeSchema>;

// ============================================
// SavedCart (whole store cart)
// ============================================

export const saveCartSchema = z.object({
  storeName: z.string().min(1).max(200),
  searchTerms: z.array(z.string().min(1)).min(1).max(50),
  products: z.array(z.record(z.unknown())).min(1).max(100),
  totalPrice: z.number().min(0),
  cheapestCount: z.number().int().min(0).default(0),
  missingTerms: z.array(z.string()).default([]),
  totalSearched: z.number().int().min(0).default(0),
});

export type SaveCartInput = z.infer<typeof saveCartSchema>;

// ============================================
// Cart refresh
// ============================================

export const refreshCartSchema = z.object({
  savedCartId: z.string().min(1),
});

export type RefreshCartInput = z.infer<typeof refreshCartSchema>;
