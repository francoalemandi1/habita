import type { EventCategory } from "@habita/contracts";

/** Casa board → "Ver todos" destination; the list lives at /casa/planes (handoff §5.2). */
export const PLANES_LIST_PATH = "/casa/planes";

/** Top-level segments on /casa/planes: own events vs. AI-suggested activities/restaurants. */
export type PlanesSegment = "eventos" | "salidas";

export const PLANES_CATEGORY_ORDER: EventCategory[] = [
  "CINE",
  "TEATRO",
  "MUSICA",
  "DANZA",
  "EXPOSICIONES",
  "FESTIVALES",
  "TALLERES",
  "LITERATURA",
  "GASTRONOMIA",
  "DEPORTES",
  "INFANTIL",
  "MERCADOS",
  "PASEOS",
  "EXCURSIONES",
  "OTRO",
];

export const PLANES_CATEGORY_LABELS: Record<EventCategory, string> = {
  CINE: "Cine",
  TEATRO: "Teatro",
  MUSICA: "Música",
  DANZA: "Danza",
  EXPOSICIONES: "Muestras",
  FESTIVALES: "Ferias",
  TALLERES: "Talleres",
  LITERATURA: "Literatura",
  GASTRONOMIA: "Gastronomía",
  DEPORTES: "Deportes",
  INFANTIL: "Infantil",
  MERCADOS: "Mercados",
  PASEOS: "Paseos",
  EXCURSIONES: "Excursiones",
  OTRO: "Otros",
};

export interface PlanRowSource {
  startDate: string | null;
  venueName: string | null;
}

/** Categories actually present in `events`, in display order. */
export function getVisiblePlanCategories<T extends { category: EventCategory }>(
  events: readonly T[],
): EventCategory[] {
  const present = new Set(events.map((event) => event.category));
  return PLANES_CATEGORY_ORDER.filter((category) => present.has(category));
}

/** Keeps only events matching `category`; returns a copy of `events` when `category` is null. */
export function filterPlansByCategory<T extends { category: EventCategory }>(
  events: readonly T[],
  category: EventCategory | null,
): T[] {
  if (!category) return [...events];
  return events.filter((event) => event.category === category);
}

/** Chronological order, soonest first; events without a date go last. */
export function sortPlansByDate<T extends { startDate: string | null }>(events: readonly T[]): T[] {
  return [...events].sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });
}

function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const MS_PER_DAY = 86_400_000;

/** "Hoy", "Mañana", a short weekday+date within a week, or a compact date otherwise. */
export function formatPlanDateLabel(startDate: string | null, now: Date): string | null {
  if (!startDate) return null;
  const eventDate = new Date(startDate);
  if (Number.isNaN(eventDate.getTime())) return null;

  const diffDays = Math.round((toDateOnly(eventDate).getTime() - toDateOnly(now).getTime()) / MS_PER_DAY);

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Mañana";

  if (diffDays >= 2 && diffDays <= 7) {
    const label = eventDate.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  return eventDate.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

/** ListRow meta string: "Hoy · Teatro Colón"; degrades gracefully when a part is missing. */
export function formatPlanRowMeta(event: PlanRowSource, now: Date): string | undefined {
  const dateLabel = formatPlanDateLabel(event.startDate, now);
  const parts = [dateLabel, event.venueName].filter((part): part is string => !!part);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/** "Gratis", "$X+" or "Consultar" when the price range is unknown. */
export function formatPlanPriceLabel(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Consultar";
  if (min === 0 && (max === null || max === 0)) return "Gratis";
  if (min !== null && min > 0) return `$${min.toLocaleString("es-AR", { maximumFractionDigits: 0 })}+`;
  return "Consultar";
}
