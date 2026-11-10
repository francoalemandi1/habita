import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMember } from "@/lib/session";
import { getStoresForCity, searchStore } from "@/lib/vtex-client";
import { rankProductsForQuery } from "@habita/prices";
import { handleApiError } from "@/lib/api-response";
import { applyRateLimit } from "@/lib/rate-limit";

import type { NextRequest } from "next/server";
import type { StoreConfig, VtexProduct } from "@/lib/vtex-client";

const bodySchema = z.object({
  storeName: z.string().min(1).max(120),
  searchTerm: z.string().min(1).max(120),
  query: z.string().min(2).max(120),
  currentProductName: z.string().min(1).max(240).optional(),
  city: z.string().min(1).max(120).nullable().optional(),
});

const MAX_RESULTS = 8;

/** searchStore throws when the store is down; report that as null, not as "no products". */
async function searchStoreOrNull(store: StoreConfig, query: string): Promise<VtexProduct[] | null> {
  try {
    return await searchStore(store, query);
  } catch (error) {
    console.warn(`[alternatives] ${store.name} search failed`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    const limited = await applyRateLimit(request, "ai", member.id);
    if (limited) return limited;

    const body: unknown = await request.json();
    const validation = bodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const { storeName, searchTerm, query, city } = validation.data;
    const effectiveCity = city ?? member.household.city ?? null;
    const store = getStoresForCity(effectiveCity).find((candidate) => candidate.name === storeName);
    if (!store) {
      return NextResponse.json({ error: "Supermercado no disponible" }, { status: 404 });
    }

    const searchQuery = query.trim().length >= 2 ? query : searchTerm;
    const products = await searchStoreOrNull(store, searchQuery);
    if (!products) {
      return NextResponse.json({ error: `${store.name} no responde ahora. Probá en un rato.` }, { status: 503 });
    }

    const ranked = rankProductsForQuery(searchQuery, products, MAX_RESULTS);

    return NextResponse.json({ alternatives: ranked });
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/shopping-plan/alternatives", method: "POST" });
  }
}
