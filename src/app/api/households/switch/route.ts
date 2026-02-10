import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { CURRENT_HOUSEHOLD_COOKIE } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { z } from "zod";

const switchSchema = z.object({
  householdId: z.string().min(1, "householdId es requerido"),
});

/**
 * POST /api/households/switch
 * Set current household (cookie). User must be a member of that household.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireAuth();
    const body: unknown = await request.json();
    const parsed = switchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { householdId } = parsed.data;

    const member = await prisma.member.findFirst({
      where: {
        userId,
        householdId,
        isActive: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "No eres miembro de ese hogar" },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(CURRENT_HOUSEHOLD_COOKIE, householdId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.json({ ok: true, householdId });
  } catch (error) {
    return handleApiError(error, { route: "/api/households/switch", method: "POST" });
  }
}
