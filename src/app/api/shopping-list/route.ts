import { NextResponse } from "next/server";
import { createShoppingListItemSchema } from "@habita/contracts";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { verifyCsrfOrigin } from "@/lib/csrf";
import { addShoppingListItem } from "@/lib/shopping-list-service";
import { serializeShoppingListItem, shoppingListItemInclude } from "@/lib/shopping-list";

import type { NextRequest } from "next/server";

const MAX_ROWS = 300;

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
    const item = await addShoppingListItem({
      householdId: member.householdId,
      addedById: member.id,
      name,
      quantity: quantity ?? 1,
      clientId,
    });

    return NextResponse.json({ item: serializeShoppingListItem(item) });
  } catch (error) {
    return handleApiError(error, { route: "/api/shopping-list", method: "POST" });
  }
}
