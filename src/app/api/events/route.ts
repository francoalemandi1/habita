import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { searchEvents } from "@/lib/events/search";
import { resolveCityId } from "@/lib/events/city-normalizer";

import type { NextRequest } from "next/server";
import type { EventCategory } from "@prisma/client";

// ============================================
// Validation
// ============================================

const VALID_CATEGORIES: EventCategory[] = [
  "CINE", "TEATRO", "MUSICA", "EXPOSICIONES", "FESTIVALES",
  "MERCADOS", "PASEOS", "EXCURSIONES", "TALLERES", "DANZA",
  "LITERATURA", "GASTRONOMIA", "DEPORTES", "INFANTIL", "OTRO",
];

const querySchema = z.object({
  city: z.string().optional(),
  category: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================
// GET /api/events
// ============================================

export async function GET(request: NextRequest) {
  try {
    await requireMember();

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validation = querySchema.safeParse(searchParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Parametros invalidos" },
        { status: 400 }
      );
    }

    const { city, category, from, to, q, limit, offset } = validation.data;

    // Resolve city name to ID
    const cityId = city ? await resolveCityId(city) : undefined;

    // Validate category
    const validCategory = category && VALID_CATEGORIES.includes(category as EventCategory)
      ? (category as EventCategory)
      : undefined;

    const searchOptions = {
      query: q,
      cityId: cityId ?? undefined,
      category: validCategory,
      dateFrom: from,
      dateTo: to,
      limit,
      offset,
    };

    const result = await searchEvents(searchOptions);

    // On-demand ingest removed: it ran the full paid scraping pipeline synchronously
    // per client-provided city with no rate limiting (this feature is being deleted next stage).

    return NextResponse.json({
      events: result.events,
      pagination: result.pagination,
      total: result.total,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/events", method: "GET" });
  }
}
