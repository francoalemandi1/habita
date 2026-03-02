import { NextResponse } from "next/server";
import { revokeMobileTokens } from "@/lib/mobile-auth";
import { handleApiError } from "@/lib/api-response";
import { z } from "zod";

import type { NextRequest } from "next/server";

const bodySchema = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    await revokeMobileTokens(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { route: "/api/auth/mobile/logout", method: "POST" });
  }
}
