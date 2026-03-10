import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

import type { NextRequest } from "next/server";

const PREFERENCE_CATEGORIES = [
  { category: "transfers", label: "Transferencias de tareas" },
  { category: "services", label: "Vencimiento de servicios" },
  { category: "expenses", label: "Gastos compartidos" },
  { category: "household", label: "Nuevos miembros" },
  { category: "plans", label: "Plan semanal" },
  { category: "culture", label: "Recomendaciones culturales" },
  { category: "deals", label: "Ofertas del supermercado" },
  { category: "summary", label: "Resumen semanal de gastos" },
];

/**
 * GET /api/notification-preferences
 * Returns all notification preferences for the current member,
 * filling in defaults for categories without explicit settings.
 */
export async function GET() {
  try {
    const member = await requireMember();

    const saved = await prisma.notificationPreference.findMany({
      where: { memberId: member.id },
    });

    const savedMap = new Map(saved.map((p) => [p.category, p.enabled]));

    const preferences = PREFERENCE_CATEGORIES.map((cat) => ({
      category: cat.category,
      label: cat.label,
      enabled: savedMap.get(cat.category) ?? true,
    }));

    return NextResponse.json({ preferences });
  } catch (error) {
    return handleApiError(error, { route: "/api/notification-preferences", method: "GET" });
  }
}

/**
 * PATCH /api/notification-preferences
 * Update a single notification preference category.
 */
export async function PATCH(request: NextRequest) {
  try {
    const member = await requireMember();
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("category" in body) ||
      !("enabled" in body)
    ) {
      return NextResponse.json({ error: "Missing category or enabled" }, { status: 400 });
    }

    const { category, enabled } = body as { category: string; enabled: boolean };

    const validCategory = PREFERENCE_CATEGORIES.find((c) => c.category === category);
    if (!validCategory) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    await prisma.notificationPreference.upsert({
      where: { memberId_category: { memberId: member.id, category } },
      update: { enabled },
      create: { memberId: member.id, category, enabled },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/notification-preferences", method: "PATCH" });
  }
}
