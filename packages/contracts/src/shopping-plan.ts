import { z } from "zod";

export const searchItemSchema = z.object({
  term: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(99),
});

export const alternativeProductSchema = z.object({
  productName: z.string(),
  price: z.number(),
  listPrice: z.number().nullable(),
  link: z.string(),
  imageUrl: z.string().nullable(),
  unitInfo: z.unknown().nullable(),
});

export const shoppingPlanAlternativesResponseSchema = z.object({
  alternatives: z.array(alternativeProductSchema),
});

export const cartProductSchema = z.object({
  searchTerm: z.string(),
  quantity: z.number().int().min(1),
  productName: z.string(),
  price: z.number(),
  lineTotal: z.number(),
  listPrice: z.number().nullable(),
  imageUrl: z.string().nullable(),
  link: z.string(),
  isCheapest: z.boolean(),
  unitInfo: z.unknown().nullable(),
  alternatives: z.array(alternativeProductSchema),
  averagePrice: z.number().nullable(),
});

export const storeCartSchema = z.object({
  storeName: z.string(),
  products: z.array(cartProductSchema),
  totalPrice: z.number(),
  cheapestCount: z.number().int().nonnegative(),
  missingTerms: z.array(z.string()),
  totalSearched: z.number().int().nonnegative(),
});

export const shoppingPlanResultSchema = z.object({
  storeCarts: z.array(storeCartSchema),
  notFound: z.array(z.string()),
  searchedAt: z.string(),
});

export type SearchItem = z.infer<typeof searchItemSchema>;
export type StoreCart = z.infer<typeof storeCartSchema>;
export type ShoppingPlanResult = z.infer<typeof shoppingPlanResultSchema>;
export type AlternativeProduct = z.infer<typeof alternativeProductSchema>;
export type ShoppingPlanAlternativesResponse = z.infer<typeof shoppingPlanAlternativesResponseSchema>;
