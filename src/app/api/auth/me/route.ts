import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/me
 * Get the current authenticated user's basic info (name, email).
 * Does not require household membership.
 */
export async function GET() {
  try {
    const userId = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        members: { where: { isActive: true }, select: { id: true }, take: 1 },
      },
    });

    return NextResponse.json({
      name: user?.name ?? null,
      email: user?.email ?? null,
      hasMembership: (user?.members?.length ?? 0) > 0,
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
