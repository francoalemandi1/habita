import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";

import type { NextRequest } from "next/server";

/**
 * POST /api/push-tokens
 * Register an Expo push token for the current member's device.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("token" in body) ||
      !("deviceId" in body)
    ) {
      return NextResponse.json({ error: "Missing token or deviceId" }, { status: 400 });
    }

    const { token, deviceId, platform } = body as {
      token: string;
      deviceId: string;
      platform?: string;
    };

    if (!token || !deviceId) {
      return NextResponse.json({ error: "token and deviceId are required" }, { status: 400 });
    }

    await prisma.expoPushToken.upsert({
      where: { memberId_deviceId: { memberId: member.id, deviceId } },
      update: {
        token,
        platform: platform ?? "ios",
      },
      create: {
        memberId: member.id,
        token,
        deviceId,
        platform: platform ?? "ios",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/push-tokens error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error saving push token" }, { status: 500 });
  }
}

/**
 * DELETE /api/push-tokens
 * Remove the Expo push token for the current member's device.
 */
export async function DELETE(request: NextRequest) {
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
    console.error("DELETE /api/push-tokens error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error removing push token" }, { status: 500 });
  }
}
