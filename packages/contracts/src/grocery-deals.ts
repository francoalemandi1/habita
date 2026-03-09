import { z } from "zod";

export const groceryCategorySchema = z.enum([
  "almacen",
  "panaderia_dulces",
  "lacteos",
  "carnes",
  "frutas_verduras",
  "bebidas",
  "limpieza",
  "perfumeria",
]);

export const productPriceSchema = z.object({
  productName: z.string(),
  store: z.string(),
  price: z.string(),
  originalPrice: z.string().nullable(),
  discount: z.string(),
  savingsPercent: z.number().nullable(),
  sourceUrl: z.string(),
  source: z.string(),
});

export const storeClusterSchema = z.object({
  storeName: z.string(),
  productCount: z.number(),
  products: z.array(productPriceSchema),
  totalEstimatedSavings: z.number(),
  averageDiscountPercent: z.number(),
  score: z.number(),
});

export const groceryDealsResponseSchema = z.object({
  clusters: z.array(storeClusterSchema),
  recommendation: z.string(),
  productsNotFound: z.array(z.string()),
  generatedAt: z.string(),
  cached: z.boolean().optional(),
});

export const groceryDealsInputSchema = z.object({
  category: groceryCategorySchema,
  city: z.string().optional(),
  country: z.string().optional(),
  forceRefresh: z.boolean().optional(),
});

export const topDealProductSchema = productPriceSchema.extend({
  categoryLabel: z.string(),
});

export const topDealsResponseSchema = z.object({
  topDeals: z.array(topDealProductSchema),
  totalDeals: z.number(),
  generatedAt: z.string(),
});

export type GroceryCategory = z.infer<typeof groceryCategorySchema>;
export type ProductPrice = z.infer<typeof productPriceSchema>;
export type StoreCluster = z.infer<typeof storeClusterSchema>;
export type GroceryDealsResponse = z.infer<typeof groceryDealsResponseSchema>;
export type GroceryDealsInput = z.infer<typeof groceryDealsInputSchema>;
export type TopDealProduct = z.infer<typeof topDealProductSchema>;
export type TopDealsResponse = z.infer<typeof topDealsResponseSchema>;
