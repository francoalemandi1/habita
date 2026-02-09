import crypto from "crypto";

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET ?? "";

const API_BASE = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}`;

export function isWhatsAppConfigured(): boolean {
  return Boolean(PHONE_NUMBER_ID && ACCESS_TOKEN);
}

export function getVerifyToken(): string {
  return VERIFY_TOKEN;
}

/**
 * Verify the X-Hub-Signature-256 header from Meta webhook requests.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!APP_SECRET || !signature) return false;

  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Send a plain text message to a WhatsApp number.
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  text: string
): Promise<boolean> {
  if (!isWhatsAppConfigured()) return false;

  try {
    const response = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: { body: text },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("WhatsApp send error:", response.status, errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return false;
  }
}

interface WhatsAppButton {
  id: string;
  title: string;
}

/**
 * Send an interactive message with reply buttons (max 3).
 */
export async function sendWhatsAppInteractive(
  phoneNumber: string,
  body: string,
  buttons: WhatsAppButton[]
): Promise<boolean> {
  if (!isWhatsAppConfigured()) return false;

  try {
    const response = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: body },
          action: {
            buttons: buttons.slice(0, 3).map((b) => ({
              type: "reply",
              reply: { id: b.id, title: b.title },
            })),
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("WhatsApp interactive send error:", response.status, errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("WhatsApp interactive send error:", error);
    return false;
  }
}

/**
 * Send a template message (for proactive messages outside 24h window).
 */
export async function sendWhatsAppTemplate(
  phoneNumber: string,
  templateName: string,
  languageCode: string,
  parameters: string[]
): Promise<boolean> {
  if (!isWhatsAppConfigured()) return false;

  try {
    const response = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components:
            parameters.length > 0
              ? [
                  {
                    type: "body",
                    parameters: parameters.map((p) => ({
                      type: "text",
                      text: p,
                    })),
                  },
                ]
              : undefined,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("WhatsApp template send error:", response.status, errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("WhatsApp template send error:", error);
    return false;
  }
}

// ============================================
// META WEBHOOK PAYLOAD TYPES
// ============================================

export interface WhatsAppWebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
  };
}

/**
 * Extract the first user message from a Meta webhook payload.
 * Returns null if the payload doesn't contain a user message.
 */
export function extractMessage(
  body: unknown
): WhatsAppWebhookMessage | null {
  const payload = body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: WhatsAppWebhookMessage[];
          statuses?: unknown[];
        };
      }>;
    }>;
  };

  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  if (!value?.messages) return null;

  const message = value.messages[0];
  if (!message) return null;

  return message;
}
