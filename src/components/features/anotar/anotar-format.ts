const AMOUNT_FORMAT = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const SHORT_DATE_FORMAT = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });
const DAY_MS = 86_400_000;

/** 12000 → "12.000"; 0 renders empty so the placeholder shows. */
export function formatAmountInput(amount: number): string {
  return amount > 0 ? AMOUNT_FORMAT.format(amount) : "";
}

/** "12.000,5" → 12000.5 (es-AR: dot groups thousands, comma marks decimals). */
export function parseAmountInput(text: string): number {
  const normalized = text.replace(/[^\d,]/g, "").replace(",", ".");
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

/** "YYYY-MM-DD" draft date → "Hoy" / "Ayer" / "7 nov", relative to the caller's local today. */
export function formatDraftDateLabel(isoDate: string, todayIsoDate: string): string {
  const date = Date.parse(`${isoDate}T00:00:00Z`);
  const today = Date.parse(`${todayIsoDate}T00:00:00Z`);
  if (Number.isNaN(date) || Number.isNaN(today)) return isoDate;
  const daysAgo = Math.round((today - date) / DAY_MS);
  if (daysAgo === 0) return "Hoy";
  if (daysAgo === 1) return "Ayer";
  return SHORT_DATE_FORMAT.format(date).replace(".", "");
}
