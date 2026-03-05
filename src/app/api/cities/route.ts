import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

const RESULT_LIMIT = 10;
const MIN_QUERY_LENGTH = 2;

/**
 * GET /api/cities?q=<search>
 * Returns cities for selection during onboarding.
 * No authentication required — used before a user has a household.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const isSearching = query.length >= MIN_QUERY_LENGTH;

    const cities = await prisma.culturalCity.findMany({
      where: isSearching
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { aliases: { has: query } },
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        province: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { name: "asc" },
      take: RESULT_LIMIT,
    });

    return NextResponse.json({ cities });
  } catch (error) {
    return handleApiError(error, { route: "/api/cities", method: "GET" });
  }
}
