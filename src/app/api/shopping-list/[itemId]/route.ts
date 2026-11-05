import { NextResponse } from "next/server";
import { updateShoppingListItemSchema } from "@habita/contracts";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { verifyCsrfOrigin } from "@/lib/csrf";
import { serializeShoppingListItem, shoppingListItemInclude } from "@/lib/shopping-list";

import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

interface RouteContext {
  params: Promise<{ itemId: string }>;
}

/**
 * PATCH /api/shopping-list/[itemId]
 * Update name, quantity, or checked state. Any member of the household may edit.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const csrfBlocked = verifyCsrfOrigin(request);
    if (csrfBlocked) return csrfBlocked;

    const member = await requireMember();
    const { itemId } = await context.params;
    const body = (await request.json()) as unknown;
    const validation = updateShoppingListItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const existing = await prisma.shoppingListItem.findFirst({
      where: { id: itemId, householdId: member.householdId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const { name, quantity, checked } = validation.data;
    const data: Prisma.ShoppingListItemUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (quantity !== undefined) data.quantity = quantity;
    if (checked !== undefined) {
      data.checkedAt = checked ? new Date() : null;
      data.checkedBy = checked ? { connect: { id: member.id } } : { disconnect: true };
    }

    const updated = await prisma.shoppingListItem.update({
      where: { id: itemId },
      data,
      include: shoppingListItemInclude,
    });

    return NextResponse.json({ item: serializeShoppingListItem(updated) });
  } catch (error) {
    return handleApiError(error, { route: "/api/shopping-list/[itemId]", method: "PATCH" });
  }
}

/**
 * DELETE /api/shopping-list/[itemId]
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const csrfBlocked = verifyCsrfOrigin(request);
    if (csrfBlocked) return csrfBlocked;

    const member = await requireMember();
    const { itemId } = await context.params;

    const existing = await prisma.shoppingListItem.findFirst({
      where: { id: itemId, householdId: member.householdId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    await prisma.shoppingListItem.delete({ where: { id: itemId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, { route: "/api/shopping-list/[itemId]", method: "DELETE" });
  }
}
