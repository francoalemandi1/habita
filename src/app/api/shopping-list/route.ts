import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createShoppingListItemSchema } from "@habita/contracts";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { verifyCsrfOrigin } from "@/lib/csrf";
import { BadRequestError } from "@/lib/errors";
import {
  normalizeShoppingListItemName,
  serializeShoppingListItem,
  shoppingListItemInclude,
} from "@/lib/shopping-list";

import type { NextRequest } from "next/server";
import type { ShoppingListItemWithMembers } from "@/lib/shopping-list";

const MAX_ROWS = 300;
const MAX_UNCHECKED_ITEMS = 200;
const MAX_QUANTITY = 99;

/**
 * GET /api/shopping-list
 * Household's shared shopping list. Unchecked items first (oldest first),
 * then checked items at the end (oldest checked first) — they never disappear.
 */
export async function GET() {
  try {
    const member = await requireMember();

    const items = await prisma.shoppingListItem.findMany({
      where: { householdId: member.householdId },
      include: shoppingListItemInclude,
      orderBy: [{ checkedAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
      take: MAX_ROWS,
    });

    return NextResponse.json({ items: items.map(serializeShoppingListItem) });
  } catch (error) {
    return handleApiError(error, { route: "/api/shopping-list", method: "GET" });
  }
}

/**
 * POST /api/shopping-list
 * Add an item to the household's shared shopping list.
 * - Replaying the same clientId returns the existing item (no duplicate insert).
 * - An unchecked item with the same normalized name bumps its quantity instead
 *   of inserting a new row.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfBlocked = verifyCsrfOrigin(request);
    if (csrfBlocked) return csrfBlocked;

    const member = await requireMember();
    const body = (await request.json()) as unknown;
    const validation = createShoppingListItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const { name, quantity, clientId } = validation.data;
    const householdId = member.householdId;

    if (clientId) {
      const replayed = await findItemByClientId(householdId, clientId);
      if (replayed) return NextResponse.json({ item: serializeShoppingListItem(replayed) });
    }

    try {
      const item = await prisma.$transaction((tx) =>
        createOrBumpItem(tx, { householdId, name, quantity: quantity ?? 1, clientId, addedById: member.id }),
      );
      return NextResponse.json({ item: serializeShoppingListItem(item) });
    } catch (error) {
      // Race: a concurrent request with the same clientId committed first.
      // Our transaction rolled back (including any bump), so return its item.
      const replayed = clientId && isUniqueViolation(error) ? await findItemByClientId(householdId, clientId) : null;
      if (replayed) return NextResponse.json({ item: serializeShoppingListItem(replayed) });
      throw error;
    }
  } catch (error) {
    return handleApiError(error, { route: "/api/shopping-list", method: "POST" });
  }
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
