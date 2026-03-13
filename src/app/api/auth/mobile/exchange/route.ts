import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueMobileTokenPair } from "@/lib/mobile-auth";
import { handleApiError } from "@/lib/api-response";
import { applyRateLimit } from "@/lib/rate-limit";
import { mobileExchangeInputSchema } from "@habita/contracts";
import { verifyGoogleIdToken } from "@/lib/google-id-token";
import { exchangeGoogleAuthCode } from "@/lib/google-auth-code";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await applyRateLimit(request, "auth");
    if (rateLimited) return rateLimited;

    const body = (await request.json()) as unknown;
    const parsed = mobileExchangeInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    // Resolve id_token: either directly provided or exchanged from auth code (PKCE flow)
    let resolvedIdToken = parsed.data.idToken ?? null;
    if (!resolvedIdToken && parsed.data.authCode) {
      if (!parsed.data.codeVerifier) {
        return NextResponse.json({ error: "codeVerifier requerido con authCode" }, { status: 400 });
      }
      resolvedIdToken = await exchangeGoogleAuthCode(parsed.data.authCode, parsed.data.codeVerifier);
      if (!resolvedIdToken) {
        return NextResponse.json({ error: "No se pudo intercambiar el código de Google" }, { status: 401 });
      }
    }

    const identity = await verifyGoogleIdToken(resolvedIdToken!);
    if (!identity) {
      return NextResponse.json({ error: "Google ID token inválido" }, { status: 401 });
    }

    const user = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: identity.providerAccountId,
          },
        },
        include: { user: true },
      });
      if (account?.user) {
        return account.user;
      }

      const userByEmail = await tx.user.findUnique({
        where: { email: identity.email },
      });

      if (userByEmail) {
        await tx.account.create({
          data: {
            userId: userByEmail.id,
            type: "oauth",
            provider: "google",
            providerAccountId: identity.providerAccountId,
          },
        });
        return userByEmail;
      }

      return tx.user.create({
        data: {
          email: identity.email,
          name: identity.name,
          image: identity.image,
          emailVerified: new Date(),
          accounts: {
            create: {
              type: "oauth",
              provider: "google",
              providerAccountId: identity.providerAccountId,
            },
          },
        },
      });
    });

    if (parsed.data.householdId) {
      const membership = await prisma.member.findFirst({
        where: {
          userId: user.id,
          householdId: parsed.data.householdId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!membership) {
        return NextResponse.json(
          { error: "No eres miembro del hogar seleccionado" },
          { status: 403 },
        );
      }
    }

    const tokens = await issueMobileTokenPair({
      userId: user.id,
      deviceId: parsed.data.deviceId ?? null,
    });
    return NextResponse.json(tokens);
  } catch (error) {
    return handleApiError(error, { route: "/api/auth/mobile/exchange", method: "POST" });
  }
}
