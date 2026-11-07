/**
 * Pure functions for the Servicios view (handoff §5.3 "Plata" — Servicios).
 * No side effects, no DB access — fully deterministic and testable.
 */

export interface DueDateInfo {
  text: string;
  tone: "overdue" | "soon" | "normal";
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** "Vence hoy" / "Vence en 3 días" / "Vencido hace 2 días" for a service's next due date. */
export function dueDateInfo(nextDueDate: string, now: Date): DueDateInfo {
  const due = startOfDay(new Date(nextDueDate));
  const today = startOfDay(now);
  const days = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (days < 0) {
    const absDays = Math.abs(days);
    return { text: `Vencido hace ${absDays} día${absDays !== 1 ? "s" : ""}`, tone: "overdue" };
  }
  if (days === 0) return { text: "Vence hoy", tone: "soon" };
  if (days <= 7) return { text: `Vence en ${days} día${days !== 1 ? "s" : ""}`, tone: "soon" };
  return { text: `Vence en ${days} días`, tone: "normal" };
}

/** Tone → text color token for a due date, shared by the list row and the detail panel. */
export const DUE_DATE_TONE_CLASS: Record<DueDateInfo["tone"], string> = {
  overdue: "text-ladrillo-text",
  soon: "text-manteca-text",
  normal: "text-ink-2",
};

export interface GmailConnectionInfo {
  connected: boolean;
  lastScanAt: string | null;
}

function formatScanTime(iso: string, now: Date): string {
  const scannedAt = new Date(iso);
  const isSameDay =
    scannedAt.getFullYear() === now.getFullYear() &&
    scannedAt.getMonth() === now.getMonth() &&
    scannedAt.getDate() === now.getDate();
  const time = scannedAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return isSameDay ? `revisado hoy ${time}` : `revisado el ${scannedAt.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;
}

/** "Gmail conectado · revisado hoy 7:00" status line (handoff §5.3 "Servicios"). */
export function gmailStatusText(info: GmailConnectionInfo, now: Date): string {
  if (!info.connected) return "Gmail no conectado";
  if (!info.lastScanAt) return "Gmail conectado · todavía no se revisó";
  return `Gmail conectado · ${formatScanTime(info.lastScanAt, now)}`;
}

/**
 * Stable key for a detected-but-not-imported service, used to remember a
 * "No es mía" dismissal client-side (there is no dismiss endpoint — §11).
 */
export function detectedServiceKey(service: { title: string; senderEmail: string }): string {
  return `${service.senderEmail.toLowerCase()}::${service.title.toLowerCase()}`;
}
