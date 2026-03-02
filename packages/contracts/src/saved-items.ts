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

export type SaveCartInput = z.infer<typeof saveCartInputSchema>;
export type SavedCart = z.infer<typeof savedCartSchema>;
export type RefreshSavedCartInput = z.infer<typeof refreshSavedCartInputSchema>;
