import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";

import type { NextRequest } from "next/server";

/**
 * POST /api/push-tokens/deregister
 * Remove the Expo push token for a device (called on logout).
 * Uses POST instead of DELETE because the mobile API client
 * doesn't support request bodies on DELETE.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body: unknown = await request.json();

    if (typeof body !== "object" || body === null || !("deviceId" in body)) {
      return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
    }

    const { deviceId } = body as { deviceId: string };

    await prisma.expoPushToken.deleteMany({
      where: { memberId: member.id, deviceId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/push-tokens/deregister error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error removing push token" }, { status: 500 });
  }
}
