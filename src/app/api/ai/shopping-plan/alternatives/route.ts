import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMember } from "@/lib/session";
import { getStoresForCity, searchStore } from "@/lib/vtex-client";
import { parseProductUnit } from "@/lib/unit-parser";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

const bodySchema = z.object({
  storeName: z.string().min(1).max(120),
  searchTerm: z.string().min(1).max(120),
  query: z.string().min(2).max(120),
  currentProductName: z.string().min(1).max(240).optional(),
  city: z.string().min(1).max(120).nullable().optional(),
});

const MAX_RESULTS = 8;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function tokenize(value: string): string[] {
  return normalize(value).split(/\s+/).filter(Boolean);
}

function scoreMatch(productName: string, query: string): number {
  const normalizedName = normalize(productName);
  const normalizedQuery = normalize(query);
  const queryTokens = tokenize(query);
  const nameTokens = tokenize(productName);

  let score = 0;
  if (normalizedName === normalizedQuery) score += 1000;
  if (normalizedName.startsWith(normalizedQuery)) score += 400;
  if (normalizedName.includes(normalizedQuery)) score += 250;

  const tokenMatches = queryTokens.filter((token) => normalizedName.includes(token)).length;
  if (queryTokens.length > 0) {
    score += (tokenMatches / queryTokens.length) * 200;
  }

  score -= Math.abs(nameTokens.length - queryTokens.length) * 3;
  return score;
}

export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
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
    const products = await searchStore(store, searchQuery);
    const ranked = products
      .map((product) => ({ product, score: scoreMatch(product.productName, searchQuery) }))
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.product.price - b.product.price;
      })
      .slice(0, MAX_RESULTS)
      .map(({ product }) => {
        const unitInfo = parseProductUnit(product.productName);
        return {
          productName: product.productName,
          price: product.price,
          listPrice: product.listPrice,
          link: product.link,
          imageUrl: product.imageUrl,
          unitInfo: unitInfo
            ? { ...unitInfo, pricePerUnit: product.price / unitInfo.quantity }
            : null,
        };
      });

    return NextResponse.json({ alternatives: ranked });
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/shopping-plan/alternatives", method: "POST" });
  }
}
