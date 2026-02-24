import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { createNoteSchema } from "@/lib/validations/household-note";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

const MEMBER_SELECT = { id: true, name: true } as const;

/**
 * GET /api/notes
 * List household notes (pinned first, then by updatedAt desc). Max 50.
 */
export async function GET() {
  try {
    const member = await requireMember();

    const notes = await prisma.householdNote.findMany({
      where: { householdId: member.householdId },
      include: { createdBy: { select: MEMBER_SELECT } },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      take: 50,
    });

    const serialized = notes.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    return handleApiError(error, { route: "/api/notes", method: "GET" });
  }
}

/**
 * POST /api/notes
 * Create a new household note.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body = (await request.json()) as unknown;
    const validation = createNoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    const note = await prisma.householdNote.create({
      data: {
        householdId: member.householdId,
        createdById: member.id,
        title: data.title,
        content: data.content ?? null,
        isPinned: data.isPinned,
      },
      include: { createdBy: { select: MEMBER_SELECT } },
    });

    return NextResponse.json({
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: "/api/notes", method: "POST" });
  }
}
