import { z } from "zod";

export const memberRefSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const shoppingListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().int(),
  addedBy: memberRefSchema,
  checkedAt: z.string().nullable(),
  checkedBy: memberRefSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createShoppingListItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  quantity: z.number().int().min(1).max(99).optional(),
  // No ":" — mirrors the settlement idempotencyKey convention for client-generated keys.
  clientId: z.string().min(8).max(100).regex(/^[^:]+$/).optional(),
});

export const updateShoppingListItemSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    quantity: z.number().int().min(1).max(99).optional(),
    checked: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.quantity !== undefined || data.checked !== undefined, {
    message: "Debés enviar al menos un campo para actualizar",
  });

export const shoppingListResponseSchema = z.object({
  items: z.array(shoppingListItemSchema),
});

export const clearCheckedShoppingListResponseSchema = z.object({
  deletedCount: z.number().int().nonnegative(),
});

export type MemberRef = z.infer<typeof memberRefSchema>;
export type ShoppingListItem = z.infer<typeof shoppingListItemSchema>;
export type CreateShoppingListItemInput = z.infer<typeof createShoppingListItemSchema>;
export type UpdateShoppingListItemInput = z.infer<typeof updateShoppingListItemSchema>;
export type ShoppingListResponse = z.infer<typeof shoppingListResponseSchema>;
export type ClearCheckedShoppingListResponse = z.infer<typeof clearCheckedShoppingListResponseSchema>;
