import { Resend } from "resend";
import { palette } from "@/lib/design-tokens";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL
  ? process.env.FROM_EMAIL
  : "Habita <onboarding@resend.dev>";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://habita.app";

// ============================================
// SHARED DESIGN SYSTEM
// ============================================

const COLORS = {
  primary: palette.primary,
  text: "#1a1a2e",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  bg: "#f4f4f5",
  cardBg: "#ffffff",
  border: "#e5e7eb",
} as const;

function wrapEmail(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg}">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
        <!-- Header -->
        <tr><td style="padding:24px 32px;background:${COLORS.primary};border-radius:12px 12px 0 0">
          <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">Habita</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:${COLORS.cardBg};padding:32px;border-radius:0 0 12px 12px">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 32px;text-align:center">
          <p style="margin:0;font-size:13px;color:${COLORS.textMuted};line-height:1.5">
            Hecho con cuidado por el equipo de Habita
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
    <tr><td style="background:${COLORS.primary};border-radius:8px;padding:12px 28px">
      <a href="${url}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:inline-block">${label}</a>
    </td></tr>
  </table>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${COLORS.border};margin:24px 0">`;
}

function sectionTitle(text: string): string {
  return `<h3 style="font-size:14px;font-weight:600;color:${COLORS.textSecondary};text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px">${text}</h3>`;
}

// ============================================
// WELCOME EMAIL
// ============================================

interface WelcomeEmailParams {
  memberName: string;
  householdName: string;
  isNewHousehold: boolean;
  inviteCode?: string;
}

/**
 * Send a welcome email when a user creates or joins a household.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function sendWelcomeEmail(
  email: string,
  params: WelcomeEmailParams
): Promise<void> {
  if (!resend) {
    console.warn("RESEND_API_KEY not configured, skipping welcome email");
    return;
  }

  const subject = params.isNewHousehold
    ? "Te damos la bienvenida a Habita"
    : `Ya sos parte de ${params.householdName}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html: buildWelcomeHtml(params),
    });
  } catch (error) {
    console.error("Failed to send welcome email:", error);
  }
}

function buildWelcomeHtml(params: WelcomeEmailParams): string {
  const { memberName, householdName, isNewHousehold, inviteCode } = params;

  const greeting = isNewHousehold
    ? `Creaste <strong>${householdName}</strong> y ya está todo listo para empezar.`
    : `Te uniste a <strong>${householdName}</strong>. El equipo te estaba esperando.`;

  const inviteUrl = inviteCode ? `${APP_URL}/join/${inviteCode}` : "";

  const inviteBlock = isNewHousehold && inviteCode
    ? `${divider()}
      ${sectionTitle("Invitá a tu familia")}
      <p style="color:${COLORS.textSecondary};font-size:14px;margin:0 0 12px">Compartí este link para que se unan al hogar:</p>
      ${ctaButton("Compartir link de invitación", inviteUrl)}
      <p style="color:${COLORS.textMuted};font-size:12px;text-align:center;margin:0">o usá el código: <strong style="letter-spacing:2px">${inviteCode}</strong></p>`
    : "";

  const steps = isNewHousehold
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0">
        <tr><td style="padding:8px 0;color:${COLORS.textSecondary};font-size:14px;line-height:1.5">
          <strong style="color:${COLORS.primary}">1.</strong>&nbsp; Revisá las tareas que se crearon con tu hogar
        </td></tr>
        <tr><td style="padding:8px 0;color:${COLORS.textSecondary};font-size:14px;line-height:1.5">
          <strong style="color:${COLORS.primary}">2.</strong>&nbsp; Invitá a los miembros de tu familia con el link
        </td></tr>
        <tr><td style="padding:8px 0;color:${COLORS.textSecondary};font-size:14px;line-height:1.5">
          <strong style="color:${COLORS.primary}">3.</strong>&nbsp; Generá el primer plan semanal para distribuir tareas
        </td></tr>
      </table>`
    : `<p style="color:${COLORS.textSecondary};font-size:14px;line-height:1.6;margin:8px 0">
        Desde ahora vas a poder ver tus tareas asignadas y organizarlas junto a tu familia.
      </p>`;

  return wrapEmail(`
    <h1 style="font-size:22px;color:${COLORS.text};margin:0 0 8px;font-weight:700">Hola, ${memberName}</h1>
    <p style="color:${COLORS.textSecondary};font-size:16px;line-height:1.5;margin:0 0 20px">${greeting}</p>

    ${divider()}
    ${sectionTitle(isNewHousehold ? "Primeros pasos" : "¿Qué sigue?")}
    ${steps}

    ${ctaButton("Ir a Habita", `${APP_URL}/dashboard`)}

    ${inviteBlock}
  `);
}

