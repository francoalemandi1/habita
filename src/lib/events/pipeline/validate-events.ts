/**
 * Deterministic event filter — date + location checks.
 *
 * Filters out:
 * - Events with invalid or past dates
 * - Events in wrong locations (Spain, Buenos Aires when target is Córdoba, etc.)
 *
 * No LLM involved — pure deterministic filtering.
 */

import type { ExtractedEvent, FilteredEvent } from "./types";

// ============================================
// Main function
// ============================================

/**
 * Filter extracted events: keep only future events in the target city.
 * Returns accepted events + count of rejected ones for logging.
 */
export function filterEvents(
  events: ExtractedEvent[],
  city: string,
  today: Date,
): { accepted: FilteredEvent[]; rejected: number } {
  const normalizedCity = normalizeText(city);
  const todayIso = toIsoDateString(today);

  const accepted: FilteredEvent[] = [];
  let rejected = 0;

  for (const event of events) {
    const venueAndAddress = [event.venue, event.address].filter(Boolean).join(" ");

    // Must have a valid ISO date
    if (!isValidIsoDate(event.date)) {
      console.log(`[filter] REJECT (invalid date "${event.date}") "${event.title}"`);
      rejected++;
      continue;
    }

    // Must be today or in the future
    if (event.date < todayIso) {
      rejected++;
      continue;
    }

    // Must not be in a wrong location (Spain, Buenos Aires, etc.)
    if (isWrongLocation(venueAndAddress, normalizedCity)) {
      console.log(`[filter] REJECT (wrong location) "${event.title}" — venue="${event.venue}"`);
      rejected++;
      continue;
    }

    accepted.push({
      title: event.title,
      date: event.date,
      time: event.time,
      venue: event.venue,
      address: event.address,
      categoryGuess: event.categoryGuess,
      description: event.description,
      priceMin: event.priceMin,
      priceMax: event.priceMax,
      artists: event.artists,
      sourceUrl: event.sourceUrl,
    });
  }

  return { accepted, rejected };
}

// ============================================
// Validation helpers
// ============================================

/** Check that date string is a valid ISO 8601 date (YYYY-MM-DD). */
function isValidIsoDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00`);
  return !isNaN(parsed.getTime());
}

/**
 * Reject events whose venue/address indicates a wrong city or country.
 * Catches Spain (Córdoba España, Andalucía, Spanish postal codes)
 * and other Argentine cities (C.A.B.A., Buenos Aires) when user is in Córdoba.
 */
function isWrongLocation(venueAndAddress: string, targetCity: string): boolean {
  const normalized = normalizeText(venueAndAddress);

  // Spanish postal codes: "CP" + 5 digits (e.g., CP14012)
  if (/cp\d{5}/.test(normalized)) return true;

  // Córdoba Spain postal codes: 14xxx (standalone 5-digit codes starting with 14)
  if (/\b14\d{3}\b/.test(normalized)) return true;

  // Explicit Spain markers — but skip if the venue also mentions the target city
  // (e.g., "Centro Cultural España Córdoba" is a legitimate Argentine venue)
  const spainMarkers = ["andalucia", "espana", "spain", "comunidad autonoma", "junta de andalucia"];
  if (spainMarkers.some((m) => normalized.includes(m)) && !normalized.includes(targetCity)) return true;

  // Landmarks/venues unique to Córdoba, Spain — zero presence in Argentina
  const spanishCordobaVenues = [
    "mezquita catedral",
    "mezquita-catedral",
    "alcazar de los reyes",
    "sinagoga de cordoba",
    "palacio de viana",
    "juderia",
    "montilla-moriles",
  ];
  if (spanishCordobaVenues.some((v) => normalized.includes(v))) return true;

  // Other Argentine cities — reject when target is not that city
  const crossCityMarkers: Record<string, string[]> = {
    "c. a. b. a.": ["cordoba", "rosario", "mendoza"],
    "c.a.b.a.": ["cordoba", "rosario", "mendoza"],
    "caba": ["cordoba", "rosario", "mendoza"],
    "ciudad autonoma de buenos aires": ["cordoba", "rosario", "mendoza"],
    "buenos aires": ["cordoba", "rosario", "mendoza"],
    "palermo": ["cordoba", "rosario", "mendoza"],
    "san telmo": ["cordoba", "rosario", "mendoza"],
    "recoleta": ["cordoba", "rosario", "mendoza"],
  };

  for (const [marker, excludedCities] of Object.entries(crossCityMarkers)) {
    if (normalized.includes(marker) && excludedCities.includes(targetCity)) {
      return true;
    }
  }

  return false;
}

// ============================================
// Text helpers
// ============================================

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
