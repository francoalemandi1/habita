import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyWebhookSignature,
  getVerifyToken,
  extractMessage,
  sendWhatsAppMessage,
  sendWhatsAppInteractive,
} from "@/lib/whatsapp";
import { handleCommand } from "@/lib/whatsapp-commands";

import type { NextRequest } from "next/server";

const MAX_VERIFICATION_ATTEMPTS = 5;

/**
 * GET /api/whatsapp/webhook
 * Meta webhook verification (called once when configuring the webhook).
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === getVerifyToken()) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST /api/whatsapp/webhook
 * Receive incoming messages from Meta Cloud API.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body: unknown = JSON.parse(rawBody);
    const message = extractMessage(body);

    if (!message) {
      return NextResponse.json({ status: "ok" });
    }

    // Extract text content (from text messages or interactive button replies)
    let messageText: string | null = null;
    if (message.type === "text" && message.text?.body) {
      messageText = message.text.body;
    } else if (
      message.type === "interactive" &&
      message.interactive?.button_reply
    ) {
      messageText = message.interactive.button_reply.id;
    }

    if (!messageText) {
      await sendWhatsAppMessage(
        message.from,
        'Solo entiendo mensajes de texto. Escribí "ayuda" para ver los comandos.'
      );
      return NextResponse.json({ status: "ok" });
    }

    // Find linked member by phone number (also check member is active)
    const link = await prisma.whatsAppLink.findFirst({
      where: {
        phoneNumber: message.from,
        isActive: true,
        member: { isActive: true },
      },
      select: {
        id: true,
        memberId: true,
        verifiedAt: true,
        verificationCode: true,
        verificationExpiresAt: true,
        verificationAttempts: true,
        member: {
          select: { householdId: true },
        },
      },
    });

    // Handle verification code for unverified links
    if (link && !link.verifiedAt) {
      const isVerificationCode = /^\d{6}$/.test(messageText.trim());

      if (isVerificationCode) {
        // Check rate limiting
        if (link.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
          await sendWhatsAppMessage(
            message.from,
            "Demasiados intentos. Solicitá un nuevo código desde la app."
          );
          return NextResponse.json({ status: "ok" });
        }

        // Check expiration
        if (link.verificationExpiresAt && new Date() > link.verificationExpiresAt) {
          await sendWhatsAppMessage(
            message.from,
            "El código expiró. Solicitá uno nuevo desde la app en Configuración."
          );
          return NextResponse.json({ status: "ok" });
        }

        // Increment attempts
        await prisma.whatsAppLink.update({
          where: { id: link.id },
          data: { verificationAttempts: { increment: 1 } },
        });

        if (messageText.trim() === link.verificationCode) {
          await prisma.whatsAppLink.update({
            where: { id: link.id },
            data: {
              verifiedAt: new Date(),
              waId: message.from,
              verificationCode: null,
              verificationExpiresAt: null,
              verificationAttempts: 0,
            },
          });
          await sendWhatsAppMessage(
            message.from,
            'Cuenta vinculada! Escribí "ayuda" para ver los comandos disponibles.'
          );
        } else {
          const remaining = MAX_VERIFICATION_ATTEMPTS - (link.verificationAttempts + 1);
          await sendWhatsAppMessage(
            message.from,
            `Código incorrecto. Te quedan ${remaining} intentos.`
          );
        }
        return NextResponse.json({ status: "ok" });
      }

      await sendWhatsAppMessage(
        message.from,
        "Tu cuenta está pendiente de verificación. Ingresá el código de 6 dígitos que te enviamos por este chat."
      );
      return NextResponse.json({ status: "ok" });
    }

    if (!link) {
      await sendWhatsAppMessage(
        message.from,
        "No tenés una cuenta vinculada. Vinculá tu WhatsApp desde la app en Configuración."
      );
      return NextResponse.json({ status: "ok" });
    }

    // Process command
    const response = await handleCommand(
      {
        memberId: link.memberId,
        householdId: link.member.householdId,
        phoneNumber: message.from,
      },
      messageText
    );

    // Send interactive buttons if available, otherwise plain text
    if (response.buttons && response.buttons.length > 0) {
      await sendWhatsAppInteractive(message.from, response.text, response.buttons);
    } else {
      await sendWhatsAppMessage(message.from, response.text);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ status: "ok" });
  }
}
