import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { generateGroceryDealsScraper, normalizeCity } from "@/lib/grocery-deals-scraper";
import { handleApiError } from "@/lib/api-response";

import type { GroceryCategory } from "@prisma/client";
import type { GroceryAdvisorResult, GroceryTab, ProductPrice } from "@/lib/grocery-deals-scraper";

// ============================================
// Constants
// ============================================

export const maxDuration = 300;

const TOP_DEALS_LIMIT = 30;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const ALL_CATEGORIES: GroceryTab[] = [
  "almacen", "panaderia_dulces", "lacteos", "carnes",
  "frutas_verduras", "bebidas", "limpieza", "perfumeria",
];

const TAB_TO_ENUM: Record<GroceryTab, GroceryCategory> = {
  almacen: "ALMACEN",
  panaderia_dulces: "PANADERIA_DULCES",
  lacteos: "LACTEOS",
  carnes: "CARNES",
  frutas_verduras: "FRUTAS_VERDURAS",
  bebidas: "BEBIDAS",
  limpieza: "LIMPIEZA",
  perfumeria: "PERFUMERIA",
};

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
// Helpers
// ============================================

interface CacheRow {
  category: GroceryCategory;
  deals: unknown;
  generatedAt: Date;
}

function extractTopDeals(cacheRows: CacheRow[]) {
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

  allDeals.sort((a, b) => (b.savingsPercent ?? 0) - (a.savingsPercent ?? 0));

  const oldestGeneratedAt = cacheRows.reduce(
    (oldest, row) => (row.generatedAt < oldest ? row.generatedAt : oldest),
    cacheRows[0]!.generatedAt,
  );

  return {
    topDeals: allDeals.slice(0, TOP_DEALS_LIMIT),
    totalDeals: allDeals.length,
    generatedAt: oldestGeneratedAt.toISOString(),
  };
}

// ============================================
// Route
// ============================================

/**
 * GET /api/ai/grocery-deals/top
 * Returns top deals across all categories for the member's city.
 * Only includes products with a real, verifiable discount (savingsPercent > 0).
 * Reads from cache if fresh; otherwise scrapes on-demand.
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

    // 1. Try cache first
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

    if (cacheRows.length > 0) {
      return NextResponse.json({ ...extractTopDeals(cacheRows), cached: true });
    }

    // 2. No fresh cache — scrape on-demand
    console.log(`[top-deals] Cache miss for "${normalized}", scraping all categories...`);

    const freshRows: CacheRow[] = [];

    for (const tab of ALL_CATEGORIES) {
      try {
        const result = await generateGroceryDealsScraper(tab, city);

        if (result && result.clusters.length > 0) {
          const now = new Date();
          const dbCategory = TAB_TO_ENUM[tab];
          const productCount = result.clusters.reduce((s, c) => s + c.productCount, 0);

          await prisma.dealCacheCity.upsert({
            where: { city_category: { city: normalized, category: dbCategory } },
            create: {
              city: normalized,
              category: dbCategory,
              deals: JSON.parse(JSON.stringify(result)),
              summary: result.recommendation,
              productCount,
              generatedAt: now,
              expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
            },
            update: {
              deals: JSON.parse(JSON.stringify(result)),
              summary: result.recommendation,
              productCount,
              generatedAt: now,
              expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
            },
          });

          freshRows.push({ category: dbCategory, deals: result, generatedAt: now });
        }
      } catch (error) {
        console.error(`[top-deals] Error scraping ${tab} for ${city}:`, error);
      }
    }

    if (freshRows.length === 0) {
      return NextResponse.json({
        topDeals: [],
        totalDeals: 0,
        generatedAt: new Date().toISOString(),
        cached: false,
      });
    }

    return NextResponse.json({ ...extractTopDeals(freshRows), cached: false });
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/grocery-deals/top", method: "GET" });
  }
}
