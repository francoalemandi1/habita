import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { isAIEnabled } from "@/lib/llm/provider";
import {
  searchProducts,
  getProductPrices,
  runWithConcurrency,
} from "@/lib/precios-claros";
import { buildShoppingPlan } from "@/lib/llm/core/shopping-plan/build-shopping-plan";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";
import type { ProductPrice } from "@/lib/llm/core/shopping-plan/types";
import type { ShoppingPlan } from "@/lib/llm/core/shopping-plan/types";
import type { GroceryCategory } from "@prisma/client";

// ============================================
// Constants
// ============================================

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const CONCURRENCY_LIMIT = 5;

// ============================================
// Schema
// ============================================

const bodySchema = z.object({
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
 * POST /api/ai/shopping-plan
 * Generate a unified shopping plan using Precios Claros API.
 * Optionally enriches with LLM recommendation if AI is enabled.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    const body: unknown = await request.json();
    const validation = bodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos invalidos" },
        { status: 400 },
      );
    }

    const { forceRefresh } = validation.data;
    const household = member.household;

    // Resolve location: request body > household fallback
    const latitude = validation.data.latitude ?? household.latitude;
    const longitude = validation.data.longitude ?? household.longitude;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "No se pudo determinar la ubicacion. Activa la geolocalizacion o configura la ubicacion del hogar." },
        { status: 400 },
      );
    }

    const locationKey = `${latitude.toFixed(1)}:${longitude.toFixed(1)}`;

    // Check cache first
    if (!forceRefresh) {
      const cached = await prisma.priceCache.findFirst({
        where: {
          householdId: member.householdId,
          locationKey,
          expiresAt: { gt: new Date() },
        },
        orderBy: { generatedAt: "desc" },
      });

      if (cached) {
        return NextResponse.json(cached.planData as unknown as ShoppingPlan);
      }
    }

    // Load active products (minus household exclusions)
    const [catalogProducts, exclusions] = await Promise.all([
      prisma.productCatalog.findMany({
        where: { isActive: true },
        select: { name: true, searchTerms: true, category: true },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      }),
      prisma.householdProductExclusion.findMany({
        where: { householdId: member.householdId },
        select: { productName: true },
      }),
    ]);

    const excludedNames = new Set(exclusions.map((e) => e.productName));
    const productsToSearch = catalogProducts.filter(
      (p) => !excludedNames.has(p.name),
    );

    if (productsToSearch.length === 0) {
      return NextResponse.json(
        { error: "No hay productos seleccionados para buscar." },
        { status: 400 },
      );
    }

    // Fetch prices from Precios Claros
    const allPrices = await fetchAllPrices(
      productsToSearch,
      latitude,
      longitude,
    );

    // Build shopping plan
    const plan = buildShoppingPlan({
      prices: allPrices,
      searchedProductNames: productsToSearch.map((p) => p.name),
      userLatitude: latitude,
      userLongitude: longitude,
    });

    // Enrich with LLM recommendation if available
    if (isAIEnabled() && plan.stores.length > 0) {
      const aiRecommendation = await generateAIRecommendation(plan, latitude, longitude);
      if (aiRecommendation) {
        plan.recommendation = aiRecommendation;
      }
    }

    // Cache the result
    const now = new Date();
    await prisma.priceCache.create({
      data: {
        householdId: member.householdId,
        locationKey,
        planData: JSON.parse(JSON.stringify(plan)),
        generatedAt: now,
        expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/shopping-plan", method: "POST" });
  }
}

// ============================================
// Fetch prices from Precios Claros
// ============================================

interface CatalogProduct {
  name: string;
  searchTerms: string;
  category: GroceryCategory;
}

async function fetchAllPrices(
  products: CatalogProduct[],
  latitude: number,
  longitude: number,
): Promise<ProductPrice[]> {
  const allPrices: ProductPrice[] = [];

  // Phase 1: Search for each product (find EANs)
  const searchResults = await runWithConcurrency(
    products,
    CONCURRENCY_LIMIT,
    async (product) => {
      const results = await searchProducts(
        product.searchTerms,
        latitude,
        longitude,
      );
      return { product, results };
    },
  );

  // Collect products with their best matching EAN
  const productsWithEAN: Array<{
    product: CatalogProduct;
    ean: string;
    brand: string;
    name: string;
    presentation: string;
  }> = [];

  for (const result of searchResults) {
    if (result.status !== "fulfilled") continue;
    const { product, results } = result.value;
    // Take the first result (most relevant)
    const bestMatch = results[0];
    if (bestMatch) {
      productsWithEAN.push({
        product,
        ean: bestMatch.ean,
        brand: bestMatch.brand,
        name: bestMatch.name,
        presentation: bestMatch.presentation,
      });
    }
  }

  // Phase 2: Get per-store prices for each EAN
  const priceResults = await runWithConcurrency(
    productsWithEAN,
    CONCURRENCY_LIMIT,
    async (item) => {
      const prices = await getProductPrices(item.ean, latitude, longitude);
      return { item, prices };
    },
  );

  for (const result of priceResults) {
    if (result.status !== "fulfilled") continue;
    const { item, prices } = result.value;

    for (const storePrice of prices) {
      allPrices.push({
        catalogProductName: item.product.name,
        ean: storePrice.ean,
        brand: storePrice.brand,
        productDescription: `${storePrice.name} ${storePrice.presentation}`.trim(),
        store: normalizeStoreBanner(storePrice.storeBanner),
        price: storePrice.price,
        storeAddress: storePrice.storeAddress,
        storeLocality: storePrice.storeLocality,
        storeLat: storePrice.storeLat,
        storeLng: storePrice.storeLng,
        category: item.product.category,
      });
    }
  }

  return allPrices;
}

// ============================================
// Store banner normalization
// ============================================

const BANNER_ALIASES: Record<string, string> = {
  "CARREFOUR HIPER": "Carrefour",
  "CARREFOUR MARKET": "Carrefour",
  "CARREFOUR EXPRESS": "Carrefour",
  "CARREFOUR MAXI": "Carrefour",
  "COTO": "Coto",
  "COTO CICSA": "Coto",
  "DIA": "Dia",
  "DIA % MARKET": "Dia",
  "DIA %": "Dia",
  "JUMBO": "Jumbo",
  "DISCO": "Disco",
  "VEA": "Vea",
  "CHANGOMAS": "Changomas",
  "WALMART": "Changomas",
  "LA ANONIMA": "La Anonima",
  "MAKRO": "Makro",
  "DIARCO": "Diarco",
  "LIBERTAD": "Libertad",
  "ATOMO": "Atomo",
};

function normalizeStoreBanner(banner: string): string {
  const upper = banner.toUpperCase().trim();
  return BANNER_ALIASES[upper] ?? titleCase(banner);
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ============================================
// AI recommendation (optional enrichment)
// ============================================

async function generateAIRecommendation(
  plan: ShoppingPlan,
  userLat: number,
  userLng: number,
): Promise<string | null> {
  try {
    const { getLLMProvider } = await import("@/lib/llm/provider");
    const provider = await getLLMProvider();

    const topStores = plan.stores.slice(0, 3);
    const storesSummary = topStores
      .map((s, i) => {
        const distText = s.distanceKm !== null ? `${s.distanceKm}km` : "distancia desconocida";
        const address = s.storeAddress ?? "direccion desconocida";
        return `${i + 1}. ${s.storeName} (${address}, ${distText}): ${s.totalProductCount} productos, canasta $${s.estimatedBasketCost.toLocaleString("es-AR")}, mejor precio en ${s.cheapestProductCount} productos`;
      })
      .join("\n");

    const prompt = `Genera una recomendacion de compras breve y util para el usuario.

## Datos
Ubicacion del usuario: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}
Productos buscados: ${plan.totalProductsSearched}
Productos encontrados: ${plan.totalProductsFound}

Top sucursales:
${storesSummary}

## Formato (JSON)
{
  "recommendation": "string (max 200 chars, recomendacion contextual considerando precio Y distancia)"
}

Reglas:
- Tono casual y directo, como un amigo que te dice donde conviene ir
- Considera el trade-off distancia vs ahorro (si un lugar es mucho mas barato pero lejos, mencionalo)
- Si dos lugares estan parejos en precio, recomienda el mas cercano
- Menciona nombres de sucursales y datos concretos (precios, distancia)
- No uses emojis
- Responde SOLO con JSON valido`;

    const result = await provider.completeWithSchema<{
      recommendation: string;
    }>({
      prompt,
      outputSchema: {
        recommendation: "string (max 200 chars)",
      },
      modelVariant: "fast",
    });

    return result.recommendation || null;
  } catch (error) {
    console.warn("[shopping-plan] AI recommendation failed, using deterministic:", error);
    return null;
  }
}
