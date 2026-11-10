import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { BadRequestError } from "@/lib/errors";
import { normalizeShoppingListItemName, shoppingListItemInclude } from "@/lib/shopping-list";

import type { ShoppingListItemWithMembers } from "@/lib/shopping-list";

export const MAX_UNCHECKED_ITEMS = 200;
export const MAX_QUANTITY = 99;

interface AddShoppingListItemParams {
  householdId: string;
  addedById: string;
  name: string;
  quantity: number;
  clientId: string | undefined;
}

/**
 * Add an item to the household's shared shopping list.
 * - Replaying the same clientId returns the existing item (no duplicate insert).
 * - An unchecked item with the same normalized name bumps its quantity instead
 *   of inserting a new row.
 */
export async function addShoppingListItem(params: AddShoppingListItemParams): Promise<ShoppingListItemWithMembers> {
  const { householdId, addedById, name, quantity, clientId } = params;

  if (clientId) {
    const replayed = await findItemByClientId(householdId, clientId);
    if (replayed) return replayed;
  }

  try {
    return await prisma.$transaction((tx) =>
      createOrBumpItem(tx, { householdId, name, quantity, clientId, addedById }),
    );
  } catch (error) {
    // Race: a concurrent request with the same clientId committed first.
    // Our transaction rolled back (including any bump), so return its item.
    const replayed = clientId && isUniqueViolation(error) ? await findItemByClientId(householdId, clientId) : null;
    if (replayed) return replayed;
    throw error;
  }
}

interface SetShoppingListItemCheckedParams {
  householdId: string;
  itemId: string;
  memberId: string;
  checked: boolean;
}

/**
 * Set an item's checked state. Idempotent: if the item is already in the
 * requested state, it's returned unchanged without a write.
 */
export async function setShoppingListItemChecked(
  params: SetShoppingListItemCheckedParams,
): Promise<ShoppingListItemWithMembers | null> {
  const { householdId, itemId, memberId, checked } = params;

  const existing = await prisma.shoppingListItem.findFirst({
    where: { id: itemId, householdId },
    include: shoppingListItemInclude,
  });
  if (!existing) return null;

  if ((existing.checkedAt !== null) === checked) return existing;

  return prisma.shoppingListItem.update({
    where: { id: itemId },
    data: {
      checkedAt: checked ? new Date() : null,
      checkedBy: checked ? { connect: { id: memberId } } : { disconnect: true },
    },
    include: shoppingListItemInclude,
  });
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function findItemByClientId(householdId: string, clientId: string): Promise<ShoppingListItemWithMembers | null> {
  const request = await prisma.shoppingListItemRequest.findUnique({
    where: { householdId_clientId: { householdId, clientId } },
    select: { item: { include: shoppingListItemInclude } },
  });
  return request?.item ?? null;
}

/**
 * Bump an unchecked item with the same normalized name, or insert a new one.
 * The clientId is recorded in the same transaction either way, so a replay
 * of this request returns the item instead of bumping it again.
 */
async function createOrBumpItem(
  tx: Prisma.TransactionClient,
  params: { householdId: string; name: string; quantity: number; clientId: string | undefined; addedById: string },
): Promise<ShoppingListItemWithMembers> {
  const item = await bumpOrInsertItem(tx, params);
  if (params.clientId) {
    await tx.shoppingListItemRequest.create({
      data: { householdId: params.householdId, clientId: params.clientId, itemId: item.id },
    });
  }
  return item;
}

async function bumpOrInsertItem(
  tx: Prisma.TransactionClient,
  params: { householdId: string; name: string; quantity: number; addedById: string },
): Promise<ShoppingListItemWithMembers> {
  const { householdId, name, quantity, addedById } = params;
  const normalizedName = normalizeShoppingListItemName(name);

  // Prisma can't filter on a derived normalized name — fetch unchecked items
  // for this household and compare in memory (capped at MAX_UNCHECKED_ITEMS).
  const unchecked = await tx.shoppingListItem.findMany({
    where: { householdId, checkedAt: null },
    select: { id: true, name: true, quantity: true },
  });
  const duplicate = unchecked.find((candidate) => normalizeShoppingListItemName(candidate.name) === normalizedName);

  if (duplicate) {
    return tx.shoppingListItem.update({
      where: { id: duplicate.id },
      data: { quantity: Math.min(duplicate.quantity + quantity, MAX_QUANTITY) },
      include: shoppingListItemInclude,
    });
  }

  if (unchecked.length >= MAX_UNCHECKED_ITEMS) {
    throw new BadRequestError(`La lista ya tiene ${MAX_UNCHECKED_ITEMS} productos`);
  }

  return tx.shoppingListItem.create({
    data: { householdId, name: name.trim(), quantity, addedById },
    include: shoppingListItemInclude,
  });
}
