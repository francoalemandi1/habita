import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { revokeAllUserMobileSessions } from "@/lib/mobile-auth";
import { handleApiError } from "@/lib/api-response";

/**
 * DELETE /api/account
 * Permanently delete the current user's account and all associated data.
 * Cascade deletes: Account, Session, MobileAuthSession, GmailConnection,
 * ProcessedEmail, Member (and all member-related data).
 */
export async function DELETE() {
  try {
    const userId = await requireAuth();

    // Revoke all mobile sessions before deleting
    await revokeAllUserMobileSessions(userId);

    // Delete user — cascades handle all related records
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/account", method: "DELETE" });
  }
}
