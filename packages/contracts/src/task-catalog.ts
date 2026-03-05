import { z } from "zod";

export const catalogTaskSchema = z.object({
  name: z.string(),
  icon: z.string(),
  defaultFrequency: z.string(),
  defaultWeight: z.number(),
  estimatedMinutes: z.number().nullable(),
  minAge: z.number().nullable(),
});

export const catalogCategorySchema = z.object({
  category: z.string(),
  label: z.string(),
  icon: z.string(),
  tasks: z.array(catalogTaskSchema),
});

export const catalogResponseSchema = z.object({
  categories: z.array(catalogCategorySchema),
});

export type CatalogTask = z.infer<typeof catalogTaskSchema>;
export type CatalogCategory = z.infer<typeof catalogCategorySchema>;
export type CatalogResponse = z.infer<typeof catalogResponseSchema>;
