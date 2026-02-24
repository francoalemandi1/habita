import { z } from "zod";

export const createInventoryItemSchema = z.object({
  name: z.string().min(1).max(100),
  quantity: z.number().int().min(0).max(9999).optional(),
  category: z.string().max(50).optional(),
  status: z.enum(["HAVE", "LOW", "NEED"]).default("HAVE"),
  notes: z.string().max(500).optional(),
});

export const updateInventoryItemSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  quantity: z.number().int().min(0).max(9999).nullable().optional(),
  category: z.string().max(50).nullable().optional(),
  status: z.enum(["HAVE", "LOW", "NEED"]).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
