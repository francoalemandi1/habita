import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember, requirePermission } from "@/lib/session";
import { setPreferenceSchema } from "@/lib/validations/preferences";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

/**
 * GET /api/preferences
 * Get the current member's task preferences
 */
export async function GET() {
  try {
    const member = await requireMember();

    const preferences = await prisma.memberPreference.findMany({
      where: { memberId: member.id },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            frequency: true,
            weight: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const preferred = preferences.filter((p) => p.preference === "PREFERRED");
    const disliked = preferences.filter((p) => p.preference === "DISLIKED");

    return NextResponse.json({
      preferences,
      preferred,
      disliked,
      stats: {
        total: preferences.length,
        preferredCount: preferred.length,
        dislikedCount: disliked.length,
      },
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/preferences", method: "GET" });
  }
}

/**
 * POST /api/preferences
 * Set a task preference for the current member
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requirePermission("preference:manage");
    const body: unknown = await request.json();

    const validation = setPreferenceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { taskId, preference } = validation.data;

    // Verify task belongs to household
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        householdId: member.householdId,
        isActive: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    // Upsert preference
    const memberPreference = await prisma.memberPreference.upsert({
      where: {
        memberId_taskId: {
          memberId: member.id,
          taskId,
        },
      },
      update: { preference },
      create: {
        memberId: member.id,
        taskId,
        preference,
      },
      include: {
        task: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ preference: memberPreference });
  } catch (error) {
    return handleApiError(error, { route: "/api/preferences", method: "POST" });
  }
}

/**
 * DELETE /api/preferences
 * Remove a task preference
 */
export async function DELETE(request: NextRequest) {
  try {
    const member = await requirePermission("preference:manage");
    const taskId = request.nextUrl.searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId es requerido" }, { status: 400 });
    }

    await prisma.memberPreference.deleteMany({
      where: {
        memberId: member.id,
        taskId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/preferences", method: "DELETE" });
  }
}
