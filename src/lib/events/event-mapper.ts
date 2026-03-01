/**
 * Map CulturalEvent DB rows to the RelaxEvent shape used by EventCard.
 * Server-compatible — no "use client" dependency.
 */

import type { EventCategory } from "@prisma/client";
import type { RelaxEvent } from "@/lib/events/types";

// ============================================
// Types
// ============================================

/** Shape returned by Prisma queries with city join. */
export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  venueName: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  category: EventCategory;
  tags: string[];
  artists: string[];
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  cityName?: string | null;
  city?: { name: string; province: string | null } | null;
  // Pipeline LLM scoring fields
  culturalScore?: number | null;
  originalityScore?: number | null;
  editorialHighlight?: string | null;
  culturalCategory?: string | null;
  finalScore?: number | null;
  ticketUrl?: string | null;
  bookingUrl?: string | null;
  mapsUrl?: string | null;
}

// ============================================
// Category mapping
// ============================================

/** Map structured curator tags (CINE, TEATRO, etc.) to UI slugs. */
const TAG_TO_UI_SLUG: Record<string, string> = {
  CINE:       "cine",
  TEATRO:     "teatro",
  MUSICA:     "musica",
  DANZA:      "danza",
  EXPOSICION: "muestras",
  TALLER:     "talleres",
  FERIA:      "ferias",
  FESTIVAL:   "ferias",
  INFANTIL:   "infantil",
  OTRO:       "ferias",
};

const VALID_TAGS = new Set(Object.keys(TAG_TO_UI_SLUG));

/** Fallback: Prisma EventCategory enum → UI slug (for rows without curator tags). */
const CATEGORY_TO_RELAX: Record<EventCategory, string> = {
  CINE: "cine",
  TEATRO: "teatro",
  MUSICA: "musica",
  DANZA: "danza",
  EXPOSICIONES: "muestras",
  FESTIVALES: "ferias",
  MERCADOS: "ferias",
  PASEOS: "ferias",
  EXCURSIONES: "ferias",
  TALLERES: "talleres",
  LITERATURA: "muestras",
  GASTRONOMIA: "ferias",
  DEPORTES: "ferias",
  INFANTIL: "infantil",
  OTRO: "ferias",
};

// ============================================
// Mapper
// ============================================

/** Convert a DB event row to the RelaxEvent shape used by EventCard. */
export function eventRowToRelaxEvent(row: EventRow): RelaxEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    category: mapCategory(row),
    venue: buildVenueLabel(row),
    dateInfo: formatEventDate(row.startDate, row.endDate),
    priceRange: formatPrice(row.priceMin, row.priceMax, row.currency),
    audience: null,
    tip: row.artists.length > 0 ? row.artists.join(", ") : null,
    url: row.mapsUrl ?? buildMapsUrl(row),
    sourceUrl: row.sourceUrl,
    imageUrl: row.imageUrl,
    isVerified: true,
    highlightReason: row.editorialHighlight ?? null,
    ticketUrl: row.ticketUrl ?? null,
    bookingUrl: row.bookingUrl ?? null,
    finalScore: row.finalScore ?? null,
    culturalCategory: row.culturalCategory ?? null,
    artists: row.artists ?? [],
    tags: row.tags ?? [],
    startDate: row.startDate
      ? (typeof row.startDate === "string" ? row.startDate : row.startDate.toISOString())
      : null,
  };
}

/**
 * Map DB category to UI slug string.
 * New events: culturalCategory holds a structured tag (e.g. "MUSICA") from z.enum().
 * Legacy events: culturalCategory may hold old free-text or be null — falls back to Prisma enum.
 */
function mapCategory(row: EventRow): string {
  const tag = row.culturalCategory;
  if (tag && VALID_TAGS.has(tag)) {
    return TAG_TO_UI_SLUG[tag]!;
  }
  return CATEGORY_TO_RELAX[row.category] ?? "ferias";
}

// ============================================
// Helpers
// ============================================

function formatEventDate(startDate: Date | string | null, endDate: Date | string | null): string {
  if (!startDate) return "Consultar";

  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  const dayName = dayNames[start.getDay()];
  const day = start.getDate();
  const month = monthNames[start.getMonth()];
  const timeStr = start.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

  let result = `${dayName} ${day} ${month}, ${timeStr}`;

  if (endDate) {
    const end = typeof endDate === "string" ? new Date(endDate) : endDate;
    const endTime = end.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

    if (start.toDateString() === end.toDateString()) {
      result = `${dayName} ${day} ${month}, ${timeStr} a ${endTime}`;
    } else {
      const endDayName = dayNames[end.getDay()];
      const endDay = end.getDate();
      const endMonth = monthNames[end.getMonth()];
      result = `${dayName} ${day} ${month} a ${endDayName} ${endDay} ${endMonth}`;
    }
  }

  return result;
}

function formatPrice(priceMin: number | null, priceMax: number | null, currency: string | null): string {
  if (priceMin === null && priceMax === null) return "Consultar";
  if (priceMin === 0 && (priceMax === null || priceMax === 0)) return "Gratis";

  const cur = currency ?? "ARS";
  if (priceMin !== null && priceMax !== null && priceMin !== priceMax) {
    return `${cur} ${priceMin.toLocaleString("es-AR")}-${priceMax.toLocaleString("es-AR")}`;
  }

  const price = priceMin ?? priceMax ?? 0;
  return `${cur} ${price.toLocaleString("es-AR")}`;
}

function buildVenueLabel(row: EventRow): string {
  const parts: string[] = [];
  if (row.venueName) parts.push(row.venueName);
  if (row.address) parts.push(row.address);
  if (parts.length > 0) return parts.join(", ");

  const cityName = row.cityName ?? row.city?.name;
  if (cityName) return cityName;
  return "Consultar";
}

function buildMapsUrl(row: EventRow): string | null {
  if (row.latitude && row.longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${row.latitude},${row.longitude}`;
  }
  const venue = row.venueName ?? row.address;
  if (venue) {
    const cityName = row.cityName ?? row.city?.name ?? "";
    const destination = encodeURIComponent(`${venue}, ${cityName}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  }
  return null;
}
