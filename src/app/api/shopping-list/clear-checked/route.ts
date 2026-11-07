import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { verifyCsrfOrigin } from "@/lib/csrf";

import type { NextRequest } from "next/server";

/**
 * POST /api/shopping-list/clear-checked
 * Delete all checked items from the household's shopping list.
 */
export async function POST(request: NextRequest) {
  try {
    const csrfBlocked = verifyCsrfOrigin(request);
    if (csrfBlocked) return csrfBlocked;

    const member = await requireMember();

    const { count: deletedCount } = await prisma.shoppingListItem.deleteMany({
      where: { householdId: member.householdId, checkedAt: { not: null } },
    });

    return NextResponse.json({ deletedCount });
  } catch (error) {
    return handleApiError(error, { route: "/api/shopping-list/clear-checked", method: "POST" });
  }
}
