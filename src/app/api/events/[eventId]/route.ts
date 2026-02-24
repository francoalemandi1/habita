import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

// ============================================
// GET /api/events/:eventId
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await requireMember();

    const { eventId } = await params;

    const event = await prisma.culturalEvent.findUnique({
      where: { id: eventId },
      include: {
        venue: true,
        city: true,
        source: { select: { name: true, type: true } },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    return handleApiError(error, { route: "/api/events/[eventId]", method: "GET" });
  }
}
