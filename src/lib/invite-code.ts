import { randomInt } from "crypto";

/**
 * Genera un código de invitación corto (10 caracteres).
 * Caracteres: A-Z y 2-9 (sin 0, O, I, 1 para evitar ambigüedades).
 * Usa crypto.randomInt para entropía criptográficamente segura.
 */
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 10): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARS[randomInt(CHARS.length)];
  }
  return code;
}

export function getInviteUrl(inviteCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://habita.app";
  return `${baseUrl}/join/${inviteCode}`;
}
