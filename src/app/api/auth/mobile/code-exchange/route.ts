import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyMobileAuthCode, issueMobileTokenPair } from "@/lib/mobile-auth";
import { handleApiError } from "@/lib/api-response";
import { applyRateLimit } from "@/lib/rate-limit";

import type { NextRequest } from "next/server";

const codeExchangeSchema = z.object({
  code: z.string().min(1, "code es requerido"),
  deviceId: z.string().min(1).max(200).optional(),
});

/**
 * POST /api/auth/mobile/code-exchange
 * Exchange a short-lived auth code (from OAuth callback deep link) for mobile tokens.
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimited = await applyRateLimit(request, "auth");
    if (rateLimited) return rateLimited;

    const body = (await request.json()) as unknown;
    const parsed = codeExchangeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const userId = verifyMobileAuthCode(parsed.data.code);
    if (!userId) {
      return NextResponse.json(
        { error: "Código de autenticación inválido o expirado" },
        { status: 401 },
      );
    }

    const tokens = await issueMobileTokenPair({
      userId,
      deviceId: parsed.data.deviceId ?? null,
    });

    return NextResponse.json(tokens);
  } catch (error) {
    return handleApiError(error, { route: "/api/auth/mobile/code-exchange", method: "POST" });
  }
}
