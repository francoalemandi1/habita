import type { Prisma } from "@prisma/client";
import type { ShoppingListItem as SerializedShoppingListItem } from "@habita/contracts";

export const shoppingListItemInclude = {
  addedBy: { select: { id: true, name: true } },
  checkedBy: { select: { id: true, name: true } },
} as const;

export type ShoppingListItemWithMembers = Prisma.ShoppingListItemGetPayload<{
  include: typeof shoppingListItemInclude;
}>;

/**
 * Normalize a shopping list item name for duplicate detection:
 * case-insensitive, accent-insensitive, collapsed whitespace.
 */
export function normalizeShoppingListItemName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function serializeShoppingListItem(item: ShoppingListItemWithMembers): SerializedShoppingListItem {
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    addedBy: { id: item.addedBy.id, name: item.addedBy.name },
    checkedAt: item.checkedAt?.toISOString() ?? null,
    checkedBy: item.checkedBy ? { id: item.checkedBy.id, name: item.checkedBy.name } : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
