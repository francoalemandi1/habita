import { NextResponse } from "next/server";
import { requireAuth, getCurrentMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/me
 * Get the current authenticated user's basic info (name, email).
 * Does not require household membership.
 */
export async function GET() {
  try {
    const userId = await requireAuth();
    const activeMember = await getCurrentMember();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        members: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            householdId: true,
            household: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      userId: user?.id ?? null,
      name: user?.name ?? null,
      email: user?.email ?? null,
      hasMembership: (user?.members.length ?? 0) > 0,
      activeHouseholdId: activeMember?.householdId ?? null,
      households: (user?.members ?? []).map((member) => ({
        id: member.household.id,
        name: member.household.name,
      })),
      members: (user?.members ?? []).map((member) => ({
        id: member.id,
        householdId: member.householdId,
        name: member.name,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { error: "Error fetching user info" },
      { status: 500 }
    );
  }
}
