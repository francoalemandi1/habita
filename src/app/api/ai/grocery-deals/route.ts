import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { isAIEnabled } from "@/lib/llm/provider";
import { generateGroceryDeals } from "@/lib/llm/grocery-advisor";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";
import type { GroceryAdvisorResult } from "@/lib/llm/grocery-advisor";

// ============================================
// Constants
// ============================================

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const VALID_CATEGORIES = [
  "almacen", "panaderia_dulces", "lacteos", "carnes",
  "frutas_verduras", "bebidas", "limpieza", "perfumeria",
] as const;

const TAB_TO_DB_CATEGORY = {
  almacen: "ALMACEN",
  panaderia_dulces: "PANADERIA_DULCES",
  lacteos: "LACTEOS",
  carnes: "CARNES",
  frutas_verduras: "FRUTAS_VERDURAS",
  bebidas: "BEBIDAS",
  limpieza: "LIMPIEZA",
  perfumeria: "PERFUMERIA",
} as const;

// ============================================
// Schema
// ============================================

const bodySchema = z.object({
  category: z.enum(VALID_CATEGORIES),
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
 * Generate or return cached grocery deals for a category and location.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    if (!isAIEnabled()) {
      return NextResponse.json(
        { error: "Las funciones de IA no están configuradas" },
        { status: 503 }
      );
    }

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

    // Resolve location: request body > household fallback
    const latitude = validation.data.latitude ?? household.latitude;
    const longitude = validation.data.longitude ?? household.longitude;
    const city = validation.data.city ?? household.city;
    const country = validation.data.country ?? household.country;
    const timezone = validation.data.timezone ?? household.timezone;

    if (!latitude || !longitude || !city || !country || !timezone) {
      return NextResponse.json(
        { error: "No se pudo determinar la ubicación. Activá la geolocalización o configurá la ubicación del hogar." },
        { status: 400 }
      );
    }

    const locationKey = `${latitude.toFixed(1)}:${longitude.toFixed(1)}`;
    const dbCategory = TAB_TO_DB_CATEGORY[category];

    // Check cache
    if (!forceRefresh) {
      const cached = await prisma.dealCache.findFirst({
        where: {
          householdId: member.householdId,
          locationKey,
          category: dbCategory,
          expiresAt: { gt: new Date() },
        },
        orderBy: { generatedAt: "desc" },
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

    // Generate new deals
    const result = await generateGroceryDeals({
      category,
      city,
      country,
      latitude,
      longitude,
      timezone,
    });

    if (!result || result.clusters.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron precios para esta categoría. Intentá de nuevo más tarde." },
        { status: 404 }
      );
    }

    // Store in cache
    const now = new Date();
    await prisma.dealCache.create({
      data: {
        householdId: member.householdId,
        locationKey,
        category: dbCategory,
        deals: JSON.parse(JSON.stringify(result)),
        summary: result.recommendation,
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
