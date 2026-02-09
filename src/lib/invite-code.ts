/**
 * Genera un código de invitación corto (8 caracteres).
 * Caracteres: A-Z y 2-9 (sin 0, O, I, 1 para evitar ambigüedades).
 */
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export function getInviteUrl(inviteCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://habita.app";
  return `${baseUrl}/join/${inviteCode}`;
}
