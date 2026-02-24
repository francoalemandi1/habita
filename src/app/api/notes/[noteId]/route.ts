import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { updateNoteSchema } from "@/lib/validations/household-note";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{ noteId: string }>;
}

/**
 * PATCH /api/notes/[noteId]
 * Update a household note (edit content, toggle pin).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { noteId } = await context.params;

    const existing = await prisma.householdNote.findFirst({
      where: { id: noteId, householdId: member.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
    }

    const body = (await request.json()) as unknown;
    const validation = updateNoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    const updated = await prisma.householdNote.update({
      where: { id: noteId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/notes/[noteId]", method: "PATCH" });
  }
}

/**
 * DELETE /api/notes/[noteId]
 * Delete a household note.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const member = await requireMember();
    const { noteId } = await context.params;

    const existing = await prisma.householdNote.findFirst({
      where: { id: noteId, householdId: member.householdId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
    }

    await prisma.householdNote.delete({ where: { id: noteId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/notes/[noteId]", method: "DELETE" });
  }
}
