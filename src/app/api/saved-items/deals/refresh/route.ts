import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { refreshCartSchema } from "@/lib/validations/saved-items";
import { compareProducts } from "@/lib/supermarket-search";

import type { Prisma } from "@prisma/client";

/**
 * POST /api/saved-items/deals/refresh
 * Refresh prices for a single saved cart by re-searching supermarkets.
 * Finds the matching store in fresh results and updates the saved cart in-place.
 */
export async function POST(request: Request) {
  try {
    const member = await requireMember();
    const body = await request.json();
    const { savedCartId } = refreshCartSchema.parse(body);

    // Find the saved cart
    const savedCart = await prisma.savedCart.findFirst({
      where: { id: savedCartId, memberId: member.id },
    });

    if (!savedCart) {
      return NextResponse.json({ error: "Carrito guardado no encontrado" }, { status: 404 });
    }

    const city = member.household.city;
    const freshResults = await compareProducts(savedCart.searchTerms, city);

    // Find the matching store in fresh results
    const freshStoreCart = freshResults.storeCarts.find(
      (sc) => sc.storeName === savedCart.storeName,
    );

    if (!freshStoreCart) {
      return NextResponse.json({ error: "Supermercado no encontrado en resultados frescos" }, { status: 404 });
    }

    // Update the saved cart with fresh data
    const updated = await prisma.savedCart.update({
      where: { id: savedCartId },
      data: {
        products: freshStoreCart.products as unknown as Prisma.InputJsonValue,
        totalPrice: freshStoreCart.totalPrice,
        cheapestCount: freshStoreCart.cheapestCount,
        missingTerms: freshStoreCart.missingTerms,
        totalSearched: freshStoreCart.totalSearched,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error, { route: "/api/saved-items/deals/refresh", method: "POST" });
  }
}
