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
  searchTerms: z
    .array(z.string().min(1).max(100))
    .min(1, "Agregá al menos un producto")
    .max(30, "Máximo 30 productos por búsqueda"),
});

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

    const { searchTerms } = validation.data;
    const city = member.household.city ?? null;

    const result = await compareProducts(searchTerms, city);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/shopping-plan", method: "POST" });
  }
}
