import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { createInventoryItemSchema } from "@/lib/validations/inventory";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

const MEMBER_SELECT = { id: true, name: true } as const;

/**
 * GET /api/inventory
 * List inventory items for the household (NEED first, then LOW, then HAVE). Max 200.
 */
export async function GET() {
  try {
    const member = await requireMember();

    const items = await prisma.inventoryItem.findMany({
      where: { householdId: member.householdId },
      include: { createdBy: { select: MEMBER_SELECT } },
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
    });

    const serialized = items.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    return handleApiError(error, { route: "/api/inventory", method: "GET" });
  }
}

/**
 * POST /api/inventory
 * Create a new inventory item.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body = (await request.json()) as unknown;
    const validation = createInventoryItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    const item = await prisma.inventoryItem.create({
      data: {
        householdId: member.householdId,
        createdById: member.id,
        name: data.name,
        quantity: data.quantity ?? null,
        category: data.category ?? null,
        status: data.status,
        notes: data.notes ?? null,
      },
      include: { createdBy: { select: MEMBER_SELECT } },
    });

    return NextResponse.json({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: "/api/inventory", method: "POST" });
  }
}
