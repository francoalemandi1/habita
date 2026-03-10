import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

import type { NextRequest } from "next/server";

const subscribeBodySchema = z.object({
  endpoint: z.string().min(1),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const unsubscribeBodySchema = z.object({
  endpoint: z.string().min(1),
});

/**
 * POST /api/push/subscribe
 * Save a push subscription for the current member.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body: unknown = await request.json();

    const parsed = subscribeBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos" },
        { status: 400 }
      );
    }

    const { endpoint, keys } = parsed.data;

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
    return handleApiError(error, { route: "/api/push/subscribe", method: "POST" });
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

    const parsed = unsubscribeBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos" },
        { status: 400 }
      );
    }

    const { endpoint } = parsed.data;

    await prisma.pushSubscription.deleteMany({
      where: {
        memberId: member.id,
        endpoint,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/push/subscribe", method: "DELETE" });
  }
}
