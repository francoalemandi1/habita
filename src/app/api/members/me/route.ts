import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { handleApiError } from "@/lib/api-response";

import type { NextRequest } from "next/server";

const updateMemberSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(50, "Máximo 50 caracteres"),
});

/**
 * GET /api/members/me
 * Get the current user's member record
 */
export async function GET() {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return NextResponse.json({ member: null });
    }

    return NextResponse.json({ member });
  } catch (error) {
    return handleApiError(error, { route: "/api/members/me", method: "GET" });
  }
}

/**
 * PATCH /api/members/me
 * Update the current member's name
 */
export async function PATCH(request: NextRequest) {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return NextResponse.json({ error: "No member found" }, { status: 404 });
    }

    const body: unknown = await request.json();
    const validation = updateMemberSchema.safeParse(body);

    if (!validation.success) {
      const message = validation.error.errors[0]?.message ?? "Datos inválidos";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const updated = await prisma.member.update({
      where: { id: member.id },
      data: { name: validation.data.name },
    });

    return NextResponse.json({ member: updated });
  } catch (error) {
    return handleApiError(error, { route: "/api/members/me", method: "PATCH" });
  }
}
