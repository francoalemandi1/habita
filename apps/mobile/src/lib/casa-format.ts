const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

/** Capitalized month name for the Plata card's "<Mes> · $total" label. */
export function formatCasaMonthLabel(date: Date): string {
  return MONTH_LABELS[date.getMonth()] ?? "";
}

/** "Para resolver" banner text for incoming task transfers (interim until Avisos, R8). */
export function buildTransferBannerText(
  count: number,
  firstFromName: string | undefined,
  firstTaskName: string | undefined,
): string {
  if (count === 0) return "";
  if (count === 1 && firstFromName && firstTaskName) {
    return `${firstFromName} quiere pasarte "${firstTaskName}"`;
  }
  return `${count} tareas por resolver`;
}
