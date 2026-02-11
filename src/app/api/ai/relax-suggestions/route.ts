import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { isAIEnabled } from "@/lib/llm/provider";
import { generateRelaxSuggestions } from "@/lib/llm/relax-finder";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";
import type { RelaxResult } from "@/lib/llm/relax-finder";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const bodySchema = z.object({
  section: z.enum(["culture", "restaurants", "weekend"]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  forceRefresh: z.boolean().optional(),
});

/**
 * POST /api/ai/relax-suggestions
 * Generate or return cached suggestions for a section and location.
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

    const { section, forceRefresh } = validation.data;
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

    // For restaurants, include meal period in key so cache is per-meal-time
    const baseLoc = `${latitude.toFixed(1)}:${longitude.toFixed(1)}`;
    const locationKey = section === "restaurants"
      ? `${baseLoc}:${getMealPeriod(timezone)}`
      : baseLoc;

    // Check cache
    if (!forceRefresh) {
      const cached = await prisma.relaxSuggestion.findFirst({
        where: {
          householdId: member.householdId,
          locationKey,
          sectionType: section,
          expiresAt: { gt: new Date() },
        },
        orderBy: { generatedAt: "desc" },
      });

      if (cached) {
        const result = cached.suggestions as unknown as RelaxResult;
        return NextResponse.json({
          events: result.events,
          summary: result.summary,
          generatedAt: cached.generatedAt.toISOString(),
          cached: true,
        });
      }
    }

    // Generate new suggestions
    const result = await generateRelaxSuggestions({
      city,
      country,
      latitude,
      longitude,
      timezone,
      section,
    });

    if (!result || result.events.length === 0) {
      return NextResponse.json(
        { error: "No se pudieron generar sugerencias. Intentá de nuevo más tarde." },
        { status: 500 }
      );
    }

    // Store in cache
    const now = new Date();
    await prisma.relaxSuggestion.create({
      data: {
        householdId: member.householdId,
        locationKey,
        sectionType: section,
        suggestions: JSON.parse(JSON.stringify(result)),
        generatedAt: now,
        expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
      },
    });

    return NextResponse.json({
      events: result.events,
      summary: result.summary,
      generatedAt: now.toISOString(),
      cached: false,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/relax-suggestions", method: "POST" });
  }
}

/** Determine the meal period based on local hour in the given timezone. */
function getMealPeriod(timezone: string): string {
  try {
    const hour = parseInt(
      new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: timezone }).format(new Date()),
      10
    );
    if (hour < 10) return "breakfast";
    if (hour < 15) return "lunch";
    if (hour < 19) return "merienda";
    return "dinner";
  } catch {
    return "unknown";
  }
}
