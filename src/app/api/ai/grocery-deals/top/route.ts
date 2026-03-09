import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { normalizeCity } from "@/lib/grocery-deals-scraper";
import { handleApiError } from "@/lib/api-response";

import type { GroceryCategory } from "@prisma/client";
import type { GroceryAdvisorResult, ProductPrice } from "@/lib/grocery-deals-scraper";

// ============================================
// Constants
// ============================================

const TOP_DEALS_LIMIT = 30;

const CATEGORY_LABELS: Record<GroceryCategory, string> = {
  ALMACEN: "Almacén",
  LACTEOS: "Lácteos",
  CARNES: "Carnes",
  FRUTAS_VERDURAS: "Frutas y Verd.",
  PANADERIA_DULCES: "Panadería",
  BEBIDAS: "Bebidas",
  LIMPIEZA: "Limpieza",
  PERFUMERIA: "Perfumería",
};

// ============================================
// Route
// ============================================

/**
 * GET /api/ai/grocery-deals/top
 * Returns top deals across all categories for the member's city.
 * Only includes products with a real, verifiable discount (savingsPercent > 0).
 * Reads from DealCacheCity — no scraping or LLM calls.
 */
export async function GET() {
  try {
    const member = await requireMember();
    const city = member.household.city;

    if (!city) {
      return NextResponse.json(
        { error: "No se pudo determinar la ciudad. Configurá la ubicación del hogar." },
        { status: 400 },
      );
    }

    const normalized = normalizeCity(city);

    // Fetch all cached categories for this city
    const cacheRows = await prisma.dealCacheCity.findMany({
      where: {
        city: normalized,
        expiresAt: { gt: new Date() },
      },
      select: {
        category: true,
        deals: true,
        generatedAt: true,
      },
    });

    if (cacheRows.length === 0) {
      return NextResponse.json({
        topDeals: [],
        totalDeals: 0,
        generatedAt: new Date().toISOString(),
      });
    }

    // Extract all products with real discounts
    const seen = new Set<string>();
    const allDeals: Array<ProductPrice & { categoryLabel: string }> = [];

    for (const row of cacheRows) {
      const result = row.deals as unknown as GroceryAdvisorResult;
      const label = CATEGORY_LABELS[row.category];

      for (const cluster of result.clusters) {
        for (const product of cluster.products) {
          if (product.savingsPercent == null || product.savingsPercent <= 0) continue;

          const dedupKey = `${product.productName}|${product.store}`;
          if (seen.has(dedupKey)) continue;
          seen.add(dedupKey);

          allDeals.push({ ...product, categoryLabel: label });
        }
      }
    }

    // Sort by discount percentage descending
    allDeals.sort((a, b) => (b.savingsPercent ?? 0) - (a.savingsPercent ?? 0));

    // Oldest generation date for transparency
    const oldestGeneratedAt = cacheRows.reduce(
      (oldest, row) => (row.generatedAt < oldest ? row.generatedAt : oldest),
      cacheRows[0]!.generatedAt,
    );

    return NextResponse.json({
      topDeals: allDeals.slice(0, TOP_DEALS_LIMIT),
      totalDeals: allDeals.length,
      generatedAt: oldestGeneratedAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/grocery-deals/top", method: "GET" });
  }
}
