import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { updateInventoryItemSchema } from "@/lib/validations/inventory";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{ itemId: string }>;
}

/**
 * PATCH /api/inventory/[itemId]
 * Update an inventory item (edit fields, toggle status).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { itemId } = await context.params;

    const existing = await prisma.inventoryItem.findFirst({
      where: { id: itemId, householdId: member.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
    }

    const body = (await request.json()) as unknown;
    const validation = updateInventoryItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    const updated = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/inventory/[itemId]", method: "PATCH" });
  }
}

/**
 * DELETE /api/inventory/[itemId]
 * Delete an inventory item.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { itemId } = await context.params;

    const existing = await prisma.inventoryItem.findFirst({
      where: { id: itemId, householdId: member.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
    }

    await prisma.inventoryItem.delete({ where: { id: itemId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/inventory/[itemId]", method: "DELETE" });
  }
}
