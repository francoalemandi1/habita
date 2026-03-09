import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { generateGroceryDealsScraper, normalizeCity } from "@/lib/grocery-deals-scraper";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";
import type { GroceryCategory } from "@prisma/client";
import type { GroceryAdvisorResult } from "@/lib/grocery-deals-scraper";

// ============================================
// Constants
// ============================================

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const VALID_CATEGORIES = [
  "almacen", "panaderia_dulces", "lacteos", "carnes",
  "frutas_verduras", "bebidas", "limpieza", "perfumeria",
] as const;

const TAB_TO_DB_CATEGORY: Record<(typeof VALID_CATEGORIES)[number], GroceryCategory> = {
  almacen: "ALMACEN",
  panaderia_dulces: "PANADERIA_DULCES",
  lacteos: "LACTEOS",
  carnes: "CARNES",
  frutas_verduras: "FRUTAS_VERDURAS",
  bebidas: "BEBIDAS",
  limpieza: "LIMPIEZA",
  perfumeria: "PERFUMERIA",
};

// ============================================
// Schema
// ============================================

const bodySchema = z.object({
  category: z.enum(VALID_CATEGORIES),
  // lat/lng kept for backward compatibility but no longer used
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  forceRefresh: z.boolean().optional(),
});

// ============================================
// Route
// ============================================

/**
 * POST /api/ai/grocery-deals
 * Return cached or generate grocery deals for a category and city.
 * Uses direct supermarket scrapers — no AI/LLM required.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    const body: unknown = await request.json();
    const validation = bodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { category, forceRefresh } = validation.data;
    const household = member.household;

    const city = validation.data.city ?? household.city;
    if (!city) {
      return NextResponse.json(
        { error: "No se pudo determinar la ciudad. Configurá la ubicación del hogar." },
        { status: 400 }
      );
    }

    const normalized = normalizeCity(city);
    const dbCategory = TAB_TO_DB_CATEGORY[category];

    // Check shared city cache
    if (!forceRefresh) {
      const cached = await prisma.dealCacheCity.findFirst({
        where: {
          city: normalized,
          category: dbCategory,
          expiresAt: { gt: new Date() },
        },
      });

      if (cached) {
        const result = cached.deals as unknown as GroceryAdvisorResult;
        return NextResponse.json({
          ...result,
          generatedAt: cached.generatedAt.toISOString(),
          cached: true,
        });
      }
    }

    // Cache miss — generate on demand with scrapers
    const result = await generateGroceryDealsScraper(category, city);

    if (!result || result.clusters.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron precios para esta categoría. Intentá de nuevo más tarde." },
        { status: 404 }
      );
    }

    // Store in shared city cache
    const now = new Date();
    await prisma.dealCacheCity.upsert({
      where: { city_category: { city: normalized, category: dbCategory } },
      create: {
        city: normalized,
        category: dbCategory,
        deals: JSON.parse(JSON.stringify(result)),
        summary: result.recommendation,
        productCount: result.clusters.reduce((s, c) => s + c.productCount, 0),
        generatedAt: now,
        expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
      },
      update: {
        deals: JSON.parse(JSON.stringify(result)),
        summary: result.recommendation,
        productCount: result.clusters.reduce((s, c) => s + c.productCount, 0),
        generatedAt: now,
        expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
      },
    });

    return NextResponse.json({
      ...result,
      cached: false,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/grocery-deals", method: "POST" });
  }
}
