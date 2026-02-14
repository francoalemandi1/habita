import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { updateProductExclusionsSchema } from "@/lib/validations/product-selection";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

/**
 * GET /api/shopping-plan/products
 * Returns the product catalog grouped by category + household exclusions.
 */
export async function GET() {
  try {
    const member = await requireMember();

    const [products, exclusions] = await Promise.all([
      prisma.productCatalog.findMany({
        where: { isActive: true },
        select: { id: true, name: true, category: true, isEssential: true },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      }),
      prisma.householdProductExclusion.findMany({
        where: { householdId: member.householdId },
        select: { productName: true },
      }),
    ]);

    const excludedProductNames = exclusions.map((e) => e.productName);

    return NextResponse.json({ products, excludedProductNames });
  } catch (error) {
    return handleApiError(error, { route: "/api/shopping-plan/products", method: "GET" });
  }
}

/**
 * PUT /api/shopping-plan/products
 * Replace the household's product exclusions (full replace).
 */
export async function PUT(request: NextRequest) {
  try {
    const member = await requireMember();
    const body: unknown = await request.json();

    const validation = updateProductExclusionsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const { excludedProductNames } = validation.data;
    const householdId = member.householdId;

    await prisma.$transaction([
      prisma.householdProductExclusion.deleteMany({
        where: { householdId },
      }),
      ...(excludedProductNames.length > 0
        ? [
            prisma.householdProductExclusion.createMany({
              data: excludedProductNames.map((productName) => ({
                householdId,
                productName,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    return NextResponse.json({
      excludedProductNames,
      count: excludedProductNames.length,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/shopping-plan/products", method: "PUT" });
  }
}
