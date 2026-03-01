import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { saveEventSchema } from "@/lib/validations/saved-items";

/**
 * GET /api/saved-items/events
 * List saved events for the current member.
 * Order: upcoming (startDate ASC), then by savedAt DESC.
 */
export async function GET() {
  try {
    const member = await requireMember();

    const savedEvents = await prisma.savedEvent.findMany({
      where: { memberId: member.id, householdId: member.householdId },
      orderBy: [{ startDate: "asc" }, { savedAt: "desc" }],
    });

    return NextResponse.json(savedEvents);
  } catch (error) {
    return handleApiError(error, { route: "/api/saved-items/events", method: "GET" });
  }
}

/**
 * POST /api/saved-items/events
 * Save an event. Upsert by memberId + culturalEventId.
 */
export async function POST(request: Request) {
  try {
    const member = await requireMember();
    const body = await request.json();
    const data = saveEventSchema.parse(body);

    const saved = await prisma.savedEvent.upsert({
      where: {
        memberId_culturalEventId: {
          memberId: member.id,
          culturalEventId: data.culturalEventId ?? "",
        },
      },
      create: {
        memberId: member.id,
        householdId: member.householdId,
        culturalEventId: data.culturalEventId ?? null,
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        startDate: data.startDate ? new Date(data.startDate) : null,
        venueName: data.venueName ?? null,
        address: data.address ?? null,
        priceRange: data.priceRange,
        sourceUrl: data.sourceUrl ?? null,
        imageUrl: data.imageUrl ?? null,
        artists: data.artists,
        tags: data.tags,
        culturalCategory: data.culturalCategory ?? null,
        highlightReason: data.highlightReason ?? null,
        ticketUrl: data.ticketUrl ?? null,
        bookingUrl: data.bookingUrl ?? null,
        dateInfo: data.dateInfo ?? null,
      },
      update: {}, // Already saved — no-op
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: "/api/saved-items/events", method: "POST" });
  }
}

/**
 * DELETE /api/saved-items/events?id=xxx
 * Remove a saved event. Verifies ownership.
 */
export async function DELETE(request: Request) {
  try {
    const member = await requireMember();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Falta el parámetro id" }, { status: 400 });
    }

    // Verify ownership before deleting
    const existing = await prisma.savedEvent.findFirst({
      where: { id, memberId: member.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Evento guardado no encontrado" }, { status: 404 });
    }

    await prisma.savedEvent.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, { route: "/api/saved-items/events", method: "DELETE" });
  }
}
