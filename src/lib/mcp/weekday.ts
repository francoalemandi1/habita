/**
 * Shared Spanish weekday enum + "today" resolution for MCP tools.
 * Shared between get_bank_promos and compare_cart.
 */

export const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const DAY_NAME_FROM_INTL: Record<string, Weekday> = {
  lunes: "Lunes",
  martes: "Martes",
  "miércoles": "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  "sábado": "Sábado",
  domingo: "Domingo",
};

/** Today's Spanish weekday name in America/Argentina/Buenos_Aires. */
export function getTodayDayNameInBuenosAires(): Weekday {
  const raw = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  })
    .format(new Date())
    .toLowerCase();
  return DAY_NAME_FROM_INTL[raw] ?? "Lunes";
}
