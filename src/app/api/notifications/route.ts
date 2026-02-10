import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { markNotificationsAsRead, markAllNotificationsAsRead } from "@/lib/notification-service";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

const MAX_NOTIFICATIONS = 50;

/**
 * GET /api/notifications
 * Get notifications for the current member from the database.
 * Query params: ?unreadOnly=true, ?limit=30, ?cursor=<id>
 */
export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();
    const searchParams = request.nextUrl.searchParams;

    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = Math.min(Number(searchParams.get("limit")) || 30, MAX_NOTIFICATIONS);
    const cursor = searchParams.get("cursor");

    const notifications = await prisma.notification.findMany({
      where: {
        memberId: member.id,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = notifications.length > limit;
    if (hasMore) notifications.pop();

    const nextCursor = hasMore ? notifications[notifications.length - 1]?.id : null;

    const unreadCount = await prisma.notification.count({
      where: { memberId: member.id, isRead: false },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
      nextCursor,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/notifications", method: "GET" });
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read.
 * Body: { ids: string[] } or { all: true }
 */
export async function PATCH(request: NextRequest) {
  try {
    const member = await requireMember();
    const body = (await request.json()) as { ids?: string[]; all?: boolean };

    let updatedCount = 0;

    if (body.all) {
      updatedCount = await markAllNotificationsAsRead(member.id);
    } else if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
      updatedCount = await markNotificationsAsRead(member.id, body.ids);
    } else {
      return NextResponse.json({ error: "Provide 'ids' array or 'all: true'" }, { status: 400 });
    }

    return NextResponse.json({ updated: updatedCount });
  } catch (error) {
    return handleApiError(error, { route: "/api/notifications", method: "PATCH" });
  }
}
