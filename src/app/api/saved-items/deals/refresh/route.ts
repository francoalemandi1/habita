import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { refreshCartSchema } from "@/lib/validations/saved-items";
import { compareProducts } from "@/lib/supermarket-search";
import { applyRateLimit } from "@/lib/rate-limit";
import { diffCartPrices } from "@/lib/saved-cart-diff";

import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import type { SearchItem } from "@/lib/supermarket-search";

function extractSearchItems(savedCart: { searchTerms: string[]; products: Prisma.JsonValue }): SearchItem[] {
  if (Array.isArray(savedCart.products)) {
    const map = new Map<string, number>();
    for (const rawProduct of savedCart.products) {
      if (!rawProduct || typeof rawProduct !== "object") continue;
      const product = rawProduct as Record<string, unknown>;
      const term = typeof product.searchTerm === "string" ? product.searchTerm.trim() : "";
      const quantityRaw = typeof product.quantity === "number" ? product.quantity : 1;
      if (!term) continue;
      const quantity = Math.max(1, Math.floor(quantityRaw));
      map.set(term, Math.max(map.get(term) ?? 0, quantity));
    }
    if (map.size > 0) {
      return Array.from(map.entries()).map(([term, quantity]) => ({ term, quantity }));
    }
  }

  return savedCart.searchTerms.map((term) => ({ term, quantity: 1 }));
}

/**
 * POST /api/saved-items/deals/refresh
 * Refresh prices for a single saved cart by re-searching supermarkets.
 * Finds the matching store in fresh results and updates the saved cart in-place.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    const limited = await applyRateLimit(request, "ai", member.id);
    if (limited) return limited;

    const body = await request.json();
    const validation = refreshCartSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }
    const { savedCartId } = validation.data;

    // Find the saved cart
    const savedCart = await prisma.savedCart.findFirst({
      where: { id: savedCartId, memberId: member.id },
    });

    if (!savedCart) {
      return NextResponse.json({ error: "Carrito guardado no encontrado" }, { status: 404 });
    }

    const city = member.household.city;
    const freshResults = await compareProducts(extractSearchItems(savedCart), city);

    if (freshResults.unavailableStores.includes(savedCart.storeName)) {
      return NextResponse.json(
        { error: `${savedCart.storeName} no responde ahora. Probá en un rato.` },
        { status: 503 },
      );
    }

    // Find the matching store in fresh results
    const freshStoreCart = freshResults.storeCarts.find(
      (sc) => sc.storeName === savedCart.storeName,
    );

    if (!freshStoreCart) {
      return NextResponse.json({ error: "Supermercado no encontrado en resultados frescos" }, { status: 404 });
    }

    const priceChanges = diffCartPrices(savedCart.products, freshStoreCart.products);

    // Update the saved cart with fresh data
    const updated = await prisma.savedCart.update({
      where: { id: savedCartId },
      data: {
        products: freshStoreCart.products as unknown as Prisma.InputJsonValue,
        totalPrice: freshStoreCart.totalPrice,
        cheapestCount: freshStoreCart.cheapestCount,
        missingTerms: freshStoreCart.missingTerms,
        totalSearched: freshStoreCart.totalSearched,
        refreshedAt: new Date(),
      },
    });

    return NextResponse.json({ ...updated, priceChanges });
  } catch (error) {
    return handleApiError(error, { route: "/api/saved-items/deals/refresh", method: "POST" });
  }
}
