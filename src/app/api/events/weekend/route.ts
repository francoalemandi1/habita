import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { getWeekendEvents } from "@/lib/events/search";
import { resolveCityId } from "@/lib/events/city-normalizer";

import type { NextRequest } from "next/server";

// ============================================
// GET /api/events/weekend
// ============================================

export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();

    // Resolve city from query param or household
    const cityParam = request.nextUrl.searchParams.get("city");
    let cityId: string | null = null;

    if (cityParam) {
      cityId = await resolveCityId(cityParam);
    } else {
      // Fallback to household city
      const household = await prisma.household.findUnique({
        where: { id: member.householdId },
        select: { city: true },
      });
      if (household?.city) {
        cityId = await resolveCityId(household.city);
      }
    }

    const events = await getWeekendEvents(cityId, 30);

    return NextResponse.json({
      events,
      cityId,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/events/weekend", method: "GET" });
  }
}
