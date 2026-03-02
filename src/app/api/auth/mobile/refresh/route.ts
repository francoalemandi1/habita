import { NextResponse } from "next/server";
import { rotateMobileRefreshToken } from "@/lib/mobile-auth";
import { handleApiError } from "@/lib/api-response";
import { mobileRefreshInputSchema } from "@habita/contracts";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = mobileRefreshInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const tokens = await rotateMobileRefreshToken(
      parsed.data.refreshToken,
      parsed.data.deviceId ?? null,
    );
    if (!tokens) {
      return NextResponse.json({ error: "Refresh token inválido o expirado" }, { status: 401 });
    }

    return NextResponse.json(tokens);
  } catch (error) {
    return handleApiError(error, { route: "/api/auth/mobile/refresh", method: "POST" });
  }
}
