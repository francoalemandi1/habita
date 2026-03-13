import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { revokeAllUserMobileSessions } from "@/lib/mobile-auth";
import { handleApiError } from "@/lib/api-response";

/**
 * POST /api/auth/revoke-all
 * Invalidate all sessions for the current user (web + mobile).
 * Use when account is compromised or user wants to log out everywhere.
 */
export async function POST() {
  try {
    const userId = await requireAuth();

    // Set invalidation timestamp — web sessions issued before this are rejected
    await prisma.user.update({
      where: { id: userId },
      data: { sessionInvalidatedAt: new Date() },
    });

    // Revoke all active mobile sessions immediately
    const revokedCount = await revokeAllUserMobileSessions(userId);

    return NextResponse.json({ ok: true, revokedMobileSessions: revokedCount });
  } catch (error) {
    return handleApiError(error, { route: "/api/auth/revoke-all", method: "POST" });
  }
}
