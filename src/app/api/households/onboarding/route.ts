import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAuth, getCurrentMember } from "@/lib/session";
import { CURRENT_HOUSEHOLD_COOKIE } from "@/lib/session";
import { createHouseholdWithTasksSchema } from "@/lib/validations/household";
import { generateInviteCode } from "@/lib/invite-code";


import type { NextRequest } from "next/server";
import type { MemberType } from "@prisma/client";

const MEMBER_TYPE_MAP: Record<string, MemberType> = {
  adult: "ADULT",
  teen: "TEEN",
  child: "CHILD",
};

/**
 * POST /api/households/onboarding
 * Crear hogar + miembro + tareas + asignaciones iniciales (flujo onboarding).
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const existingMember = await getCurrentMember();
    if (existingMember) {
      return NextResponse.json(
        { error: "Ya eres miembro de un hogar" },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const validation = createHouseholdWithTasksSchema.safeParse(body);
    if (!validation.success) {
      const message = validation.error.errors[0]?.message ?? "Datos inválidos";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { householdName, memberName, memberType, tasks } = validation.data;
    const prismaMemberType: MemberType =
      MEMBER_TYPE_MAP[memberType ?? "adult"] ?? "ADULT";

    let inviteCode = generateInviteCode(8);
    let exists = await prisma.household.findUnique({
      where: { inviteCode },
    });
    while (exists) {
      inviteCode = generateInviteCode(8);
      exists = await prisma.household.findUnique({ where: { inviteCode } });
    }

    const result = await prisma.$transaction(async (tx) => {
      const household = await tx.household.create({
        data: { name: householdName, inviteCode },
      });

      const member = await tx.member.create({
        data: {
          userId,
          householdId: household.id,
          name: memberName,
          memberType: prismaMemberType,
        },
      });

      await tx.memberLevel.create({
        data: { memberId: member.id },
      });

      let tasksCreated = 0;
      for (const t of tasks) {
        await tx.task.create({
          data: {
            householdId: household.id,
            name: t.name,
            frequency: t.frequency,
            weight: t.weight ?? 2,
            estimatedMinutes: t.estimatedMinutes ?? undefined,
          },
        });
        tasksCreated++;
      }

      return {
        household: {
          id: household.id,
          name: household.name,
          inviteCode: household.inviteCode,
          createdAt: household.createdAt,
        },
        member: {
          id: member.id,
          name: member.name,
          memberType: member.memberType,
          createdAt: member.createdAt,
        },
        tasksCreated,
      };
    });

    const cookieStore = await cookies();
    cookieStore.set(CURRENT_HOUSEHOLD_COOKIE, result.household.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/households/onboarding error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Error al crear el hogar" },
      { status: 500 }
    );
  }
}
