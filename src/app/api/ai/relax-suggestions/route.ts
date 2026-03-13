import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { resolveCityId } from "@/lib/events/city-normalizer";
import { eventRowToRelaxEvent } from "@/lib/events/event-mapper";
import { generateRelaxSuggestions } from "@/lib/llm/relax-finder";
import { normalizeCity } from "@/lib/grocery-deals-scraper";

import type { NextRequest } from "next/server";

const RESTAURANT_CACHE_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

const bodySchema = z.object({
  section: z.enum(["activities", "restaurants"]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  forceRefresh: z.boolean().optional(),
});

/**
 * POST /api/ai/relax-suggestions
 *
 * Returns events from the cultural_events table, ordered by finalScore.
 * The Python pipeline is the sole source of events — this route only reads from DB.
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

    const { section } = validation.data;
    const household = member.household;

    // Resolve city: request body > household fallback
    const city = validation.data.city ?? household.city;

    if (!city) {
      return NextResponse.json(
        { error: "No se pudo determinar la ubicación. Configurá la ubicación del hogar en el perfil." },
        { status: 400 }
      );
    }

    // Restaurants: city-level cache with LLM fallback
    if (section === "restaurants") {
      const normalized = normalizeCity(city);

      // Check city cache (unless forceRefresh)
      if (!validation.data.forceRefresh) {
        const cached = await prisma.restaurantCacheCity.findFirst({
          where: {
            city: normalized,
            expiresAt: { gt: new Date() },
          },
        });

        if (cached) {
          const restaurants = cached.restaurants as unknown as Record<string, unknown>[];
          return NextResponse.json({
            events: restaurants,
            summary: cached.summary,
            generatedAt: cached.generatedAt.toISOString(),
            cached: true,
          });
        }
      }

      // Cache miss — generate via LLM pipeline
      const result = await generateRelaxSuggestions({
        city,
        country: validation.data.country ?? household.country ?? "AR",
        latitude: validation.data.latitude ?? household.latitude ?? 0,
        longitude: validation.data.longitude ?? household.longitude ?? 0,
        timezone: validation.data.timezone ?? "America/Argentina/Cordoba",
        section: "restaurants",
      });

      if (!result) {
        return NextResponse.json({
          events: [],
          summary: "",
          generatedAt: new Date().toISOString(),
          cached: false,
        });
      }

      // Add fields that the LLM output doesn't include but RelaxEvent requires
      const events = result.events.map((e) => ({
        ...e,
        id: null,
        startDate: null,
        finalScore: null,
        culturalCategory: null,
        artists: [],
        tags: [],
      }));

      // Store in city cache
      const now = new Date();
      await prisma.restaurantCacheCity.upsert({
        where: { city: normalized },
        create: {
          city: normalized,
          restaurants: JSON.parse(JSON.stringify(events)),
          summary: result.summary,
          restaurantCount: events.length,
          generatedAt: now,
          expiresAt: new Date(now.getTime() + RESTAURANT_CACHE_TTL_MS),
        },
        update: {
          restaurants: JSON.parse(JSON.stringify(events)),
          summary: result.summary,
          restaurantCount: events.length,
          generatedAt: now,
          expiresAt: new Date(now.getTime() + RESTAURANT_CACHE_TTL_MS),
        },
      });

      return NextResponse.json({
        events,
        summary: result.summary,
        generatedAt: now.toISOString(),
        cached: false,
      });
    }

    const events = await fetchEventsFromDb(city);

    return NextResponse.json({
      events,
      summary: events.length > 0
        ? `${events.length} planes y actividades en ${city}`
        : "",
      generatedAt: new Date().toISOString(),
      cached: false,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/relax-suggestions", method: "POST" });
  }
}

/** Fetch active events from cultural_events, ordered by finalScore. */
async function fetchEventsFromDb(cityName: string) {
  const cityId = await resolveCityId(cityName);
  const now = new Date();
  const threeMonthsFromNow = new Date(now);
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  const rows = await prisma.culturalEvent.findMany({
    where: {
      status: "ACTIVE",
      ...(cityId ? { cityId } : {}),
      startDate: {
        gte: now,
        lte: threeMonthsFromNow,
      },
    },
    orderBy: [
      { finalScore: { sort: "desc", nulls: "last" } },
      { startDate: "asc" },
    ],
    take: 50,
    include: { city: true },
  });

  return rows.map((row) => eventRowToRelaxEvent(row));
}
