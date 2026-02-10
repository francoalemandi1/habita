import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { updateMemberSchema } from "@/lib/validations/member";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ memberId: string }>;
}

/**
 * GET /api/members/[memberId]
 * Get a specific member (must be from same household)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const currentMember = await requireMember();
    const { memberId } = await params;

    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        householdId: currentMember.householdId, // Data isolation
      },
      include: {
        level: true,
        achievements: {
          include: {
            achievement: { select: { id: true, name: true, description: true, xpReward: true } },
          },
          orderBy: { unlockedAt: "desc" },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Miembro no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ member });
  } catch (error) {
    return handleApiError(error, { route: "/api/members/[memberId]", method: "GET" });
  }
}

/**
 * PATCH /api/members/[memberId]
 * Update a member (must be from same household)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const currentMember = await requireMember();
    const { memberId } = await params;
    const body: unknown = await request.json();

    const validation = updateMemberSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    // Only adults can change memberType or isActive on other members
    const wantsAdminFields = validation.data.memberType !== undefined || validation.data.isActive !== undefined;
    if (wantsAdminFields && !hasPermission(currentMember.memberType, "member:manage")) {
      return NextResponse.json(
        { error: "Solo los adultos pueden cambiar tipo o estado de miembros" },
        { status: 403 }
      );
    }

    // Non-adults can only edit their own profile (name, avatar)
    if (memberId !== currentMember.id && !hasPermission(currentMember.memberType, "member:manage")) {
      return NextResponse.json(
        { error: "Solo los adultos pueden editar otros miembros" },
        { status: 403 }
      );
    }

    // Verify member belongs to same household
    const existingMember = await prisma.member.findFirst({
      where: {
        id: memberId,
        householdId: currentMember.householdId,
      },
      select: { id: true },
    });

    if (!existingMember) {
      return NextResponse.json(
        { error: "Miembro no encontrado" },
        { status: 404 }
      );
    }

    const updatedMember = await prisma.member.update({
      where: { id: memberId },
      data: validation.data,
      include: {
        level: true,
      },
    });

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    return handleApiError(error, { route: "/api/members/[memberId]", method: "PATCH" });
  }
}
