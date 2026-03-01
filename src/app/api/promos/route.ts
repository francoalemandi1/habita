import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/promos
 *
 * Returns bank promotions for the household.
 * Optional query param: ?storeName=Jumbo to filter by store.
 */
export async function GET(request: Request) {
  try {
    const member = await requireMember();
    const { searchParams } = new URL(request.url);
    const storeName = searchParams.get("storeName");

    const promos = await prisma.bankPromo.findMany({
      where: {
        householdId: member.householdId,
        ...(storeName && { storeName }),
        // Exclude expired promos
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } },
        ],
      },
      orderBy: [
        { storeName: "asc" },
        { discountPercent: "desc" },
      ],
    });

    return NextResponse.json(promos);
  } catch (error) {
    return handleApiError(error, { route: "/api/promos", method: "GET" });
  }
}
