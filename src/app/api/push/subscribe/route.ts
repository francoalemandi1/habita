import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

import type { NextRequest } from "next/server";

interface SubscribeBody {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * POST /api/push/subscribe
 * Save a push subscription for the current member.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("endpoint" in body) ||
      !("keys" in body)
    ) {
      return NextResponse.json(
        { error: "Invalid subscription data" },
        { status: 400 }
      );
    }

    const { endpoint, keys } = body as SubscribeBody;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Missing subscription fields" },
        { status: 400 }
      );
    }

    // Upsert: update if endpoint already exists, create otherwise
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        memberId: member.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        memberId: member.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/push/subscribe error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Error saving subscription" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push/subscribe
 * Remove a push subscription for the current member.
 */
export async function DELETE(request: NextRequest) {
  try {
    const member = await requireMember();
    const body: unknown = await request.json();

    if (typeof body !== "object" || body === null || !("endpoint" in body)) {
      return NextResponse.json(
        { error: "Missing endpoint" },
        { status: 400 }
      );
    }

    const { endpoint } = body as { endpoint: string };

    await prisma.pushSubscription.deleteMany({
      where: {
        memberId: member.id,
        endpoint,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/push/subscribe error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Error removing subscription" },
      { status: 500 }
    );
  }
}
