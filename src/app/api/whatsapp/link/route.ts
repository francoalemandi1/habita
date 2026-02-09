import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

import type { NextRequest } from "next/server";

const VERIFICATION_EXPIRY_MINUTES = 10;
const MAX_VERIFICATION_ATTEMPTS = 5;

const linkSchema = z.object({
  phoneNumber: z
    .string()
    .transform((val) => val.replace(/[\s\-()]/g, ""))
    .pipe(
      z.string().regex(/^\+\d{10,15}$/, "Número inválido. Usá formato internacional: +5491123456789")
    ),
});

/**
 * GET /api/whatsapp/link
 * Get current WhatsApp link status for the member.
 */
export async function GET() {
  try {
    const member = await requireMember();

    const link = await prisma.whatsAppLink.findUnique({
      where: { memberId: member.id },
      select: {
        phoneNumber: true,
        verifiedAt: true,
        verificationExpiresAt: true,
        isActive: true,
      },
    });

    if (!link) {
      return NextResponse.json({ isLinked: false });
    }

    // Mask phone number: +5491112345678 → +549111****678
    const masked =
      link.phoneNumber.slice(0, 7) +
      "****" +
      link.phoneNumber.slice(-3);

    const isVerificationExpired =
      !link.verifiedAt &&
      link.verificationExpiresAt &&
      new Date() > link.verificationExpiresAt;

    return NextResponse.json({
      isLinked: true,
      phoneNumber: masked,
      isVerified: Boolean(link.verifiedAt),
      isActive: link.isActive,
      isVerificationExpired,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("GET /api/whatsapp/link error:", error);
    return NextResponse.json({ error: "Error al obtener estado" }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/link
 * Link a WhatsApp number to the current member.
 * Sends a verification code via WhatsApp.
 * Also used to re-send verification code.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body: unknown = await request.json();

    const validation = linkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { phoneNumber } = validation.data;

    // Check if this phone is already linked to someone else
    const existingLink = await prisma.whatsAppLink.findUnique({
      where: { phoneNumber },
    });

    if (existingLink && existingLink.memberId !== member.id) {
      return NextResponse.json(
        { error: "Este número ya está vinculado a otra cuenta. Si es tuyo, pedí al otro miembro que lo desvincule." },
        { status: 409 }
      );
    }

    // Generate 6-digit verification code
    const verificationCode = String(
      Math.floor(100000 + Math.random() * 900000)
    );

    const expiresAt = new Date(
      Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000
    );

    // Upsert link (in case the member is re-linking or re-sending code)
    await prisma.whatsAppLink.upsert({
      where: { memberId: member.id },
      update: {
        phoneNumber,
        verificationCode,
        verificationExpiresAt: expiresAt,
        verificationAttempts: 0,
        verifiedAt: null,
        waId: null,
        isActive: true,
      },
      create: {
        memberId: member.id,
        phoneNumber,
        verificationCode,
        verificationExpiresAt: expiresAt,
      },
    });

    // Send verification code via WhatsApp
    const sent = await sendWhatsAppMessage(
      phoneNumber,
      `Tu código de verificación de Habita es: ${verificationCode}\n\nExpira en ${VERIFICATION_EXPIRY_MINUTES} minutos.`
    );

    if (!sent) {
      return NextResponse.json(
        { error: "No se pudo enviar el mensaje. Verificá que el número tenga WhatsApp activo." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("POST /api/whatsapp/link error:", error);
    return NextResponse.json({ error: "Error al vincular" }, { status: 500 });
  }
}

/**
 * DELETE /api/whatsapp/link
 * Unlink WhatsApp from the current member.
 */
export async function DELETE() {
  try {
    const member = await requireMember();

    await prisma.whatsAppLink.deleteMany({
      where: { memberId: member.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Not a member of any household") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("DELETE /api/whatsapp/link error:", error);
    return NextResponse.json({ error: "Error al desvincular" }, { status: 500 });
  }
}
