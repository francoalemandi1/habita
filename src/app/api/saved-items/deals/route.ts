import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { saveCartSchema } from "@/lib/validations/saved-items";

import type { Prisma } from "@prisma/client";

/**
 * GET /api/saved-items/deals
 * List saved carts for the current member. Order: savedAt DESC.
 */
export async function GET() {
  try {
    const member = await requireMember();

    const savedCarts = await prisma.savedCart.findMany({
      where: { memberId: member.id, householdId: member.householdId },
      orderBy: { savedAt: "desc" },
    });

    return NextResponse.json(savedCarts);
  } catch (error) {
    return handleApiError(error, { route: "/api/saved-items/deals", method: "GET" });
  }
}

/**
 * POST /api/saved-items/deals
 * Save a store cart snapshot. Each save creates a new record.
 */
export async function POST(request: Request) {
  try {
    const member = await requireMember();
    const body = await request.json();
    const data = saveCartSchema.parse(body);

    const saved = await prisma.savedCart.create({
      data: {
        memberId: member.id,
        householdId: member.householdId,
        storeName: data.storeName,
        searchTerms: data.searchTerms,
        products: data.products as Prisma.InputJsonValue,
        totalPrice: data.totalPrice,
        cheapestCount: data.cheapestCount,
        missingTerms: data.missingTerms,
        totalSearched: data.totalSearched,
      },
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: "/api/saved-items/deals", method: "POST" });
  }
}

/**
 * DELETE /api/saved-items/deals?id=xxx
 * Remove a saved cart. Verifies ownership.
 */
export async function DELETE(request: Request) {
  try {
    const member = await requireMember();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Falta el parámetro id" }, { status: 400 });
    }

    const existing = await prisma.savedCart.findFirst({
      where: { id, memberId: member.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Carrito guardado no encontrado" }, { status: 404 });
    }

    await prisma.savedCart.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, { route: "/api/saved-items/deals", method: "DELETE" });
  }
}
