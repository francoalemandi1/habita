import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateGroceryDealsScraper, normalizeCity } from "@/lib/grocery-deals-scraper";

import type { NextRequest } from "next/server";
import type { GroceryTab } from "@/lib/grocery-deals-scraper";
import type { GroceryCategory } from "@prisma/client";

// ============================================
// POST /api/cron/grocery-deals
//
// Pre-generates grocery deals for all active cities.
// Uses direct supermarket scrapers (no Tavily/LLM).
//
// Query params:
//   ?city=Córdoba  → Process only that city (optional)
// ============================================

export const maxDuration = 300;

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

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 503 },
      );
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const targetCity = request.nextUrl.searchParams.get("city");

    // Discover active cities from households
    let cities: string[];
    if (targetCity) {
      cities = [targetCity];
    } else {
      const rows = await prisma.household.findMany({
        where: { city: { not: null } },
        select: { city: true },
        distinct: ["city"],
      });
      cities = rows.map((r) => r.city).filter((c): c is string => c !== null);
    }

    if (cities.length === 0) {
      return NextResponse.json({ success: true, message: "No active cities found", results: [] });
    }

    console.log(`[grocery-deals-cron] Processing ${cities.length} cities: ${cities.join(", ")}`);

    const results: Array<{ city: string; category: string; productCount: number; ok: boolean }> = [];

    for (const city of cities) {
      const normalized = normalizeCity(city);

      for (const category of ALL_CATEGORIES) {
        try {
          const result = await generateGroceryDealsScraper(category, city);

          if (result && result.clusters.length > 0) {
            const now = new Date();
            const productCount = result.clusters.reduce((s, c) => s + c.productCount, 0);

            await prisma.dealCacheCity.upsert({
              where: { city_category: { city: normalized, category: TAB_TO_ENUM[category] } },
              create: {
                city: normalized,
                category: TAB_TO_ENUM[category],
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

            results.push({ city, category, productCount, ok: true });
          } else {
            results.push({ city, category, productCount: 0, ok: false });
          }
        } catch (error) {
          console.error(`[grocery-deals-cron] Error ${city}/${category}:`, error);
          results.push({ city, category, productCount: 0, ok: false });
        }
      }

      console.log(`[grocery-deals-cron] Finished ${city}`);
    }

    const successCount = results.filter((r) => r.ok).length;
    console.log(`[grocery-deals-cron] Done: ${successCount}/${results.length} successful`);

    return NextResponse.json({
      success: true,
      cities: cities.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[grocery-deals-cron] Fatal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
