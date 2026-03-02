import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMember } from "@/lib/session";
import { compareProducts } from "@/lib/supermarket-search";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

// ============================================
// Schema
// ============================================

const bodySchema = z.object({
  searchTerms: z.array(z.string().min(1).max(100)).max(30).optional(),
  searchItems: z.array(
    z.object({
      term: z.string().min(1).max(100),
      quantity: z.number().int().min(1).max(99),
    }),
  ).max(30).optional(),
}).refine(
  (body) => (body.searchItems?.length ?? 0) > 0 || (body.searchTerms?.length ?? 0) > 0,
  { message: "Agregá al menos un producto" },
);

// ============================================
// Route
// ============================================

/**
 * POST /api/ai/shopping-plan
 * Compare prices across supermarkets for a list of product search terms.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    const body: unknown = await request.json();
    const validation = bodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const searchInput = validation.data.searchItems ?? validation.data.searchTerms ?? [];
    const city = member.household.city ?? null;

    const result = await compareProducts(searchInput, city);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/shopping-plan", method: "POST" });
  }
}
