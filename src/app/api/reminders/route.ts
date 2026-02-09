import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";

/**
 * GET /api/reminders
 * Get reminders for the current member
 */
export async function GET() {
  try {
    const member = await requireMember();

    const reminders = await prisma.taskReminder.findMany({
      where: {
        memberId: member.id,
        sentAt: null, // Only unsent reminders
      },
      include: {
        assignment: {
          include: {
            task: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledFor: "asc" },
      take: 50,
    });

    return NextResponse.json({ reminders });
  } catch (error) {
    console.error("GET /api/reminders error:", error);

    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error fetching reminders" }, { status: 500 });
  }
}
