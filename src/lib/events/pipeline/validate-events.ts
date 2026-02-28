/**
 * Stage 5: Deterministic validation — factual integrity checks.
 *
 * Every rule is deterministic — no LLM involved.
 * Events failing ANY required check are rejected.
 *
 * Returns three buckets:
 *   - valid: passed all checks
 *   - expired: only failed dateFuture (structurally sound but past date)
 *   - invalid: failed structural checks (bad data from LLM)
 *
 * This distinction matters for yield control: expired events are normal
 * (agendas list the whole month), but invalid events signal a bad source.
 */

import type { ExtractedEvent, ValidatedEvent } from "./types";

// ============================================
// Types
// ============================================

export interface ValidationResult {
  valid: ValidatedEvent[];
  /** Events that only failed dateFuture — structurally sound but past date. */
  expired: ExtractedEvent[];
  /** Events that failed structural checks — bad data. */
  invalid: ExtractedEvent[];
}

// ============================================
// Main function
// ============================================

/**
 * Validate extracted events with deterministic rules.
 * Returns separate valid/expired/invalid lists.
 */
export function validateEvents(
  events: ExtractedEvent[],
  city: string,
  today: Date
): ValidationResult {
  const valid: ValidatedEvent[] = [];
  const expired: ExtractedEvent[] = [];
  const invalid: ExtractedEvent[] = [];

  const normalizedCity = normalizeText(city);
  const todayIso = toIsoDateString(today);

  for (const event of events) {
    const venueAndAddress = [event.venue, event.address].filter(Boolean).join(" ");

    const flags = {
      dateValid: isValidIsoDate(event.date),
      dateFuture: isDateFuture(event.date, todayIso),
      titleMinLength: event.title.trim().length >= 3,
      venueNonEmpty: event.venue.trim().length > 0,
      sourceUrlValid: isValidUrl(event.sourceUrl),
      cityMentioned: cityAppearsIn(normalizedCity, venueAndAddress),
      notWrongLocation: !isWrongLocation(venueAndAddress, normalizedCity),
    };

    // Structural checks — notWrongLocation rejects cross-city/cross-country events
    const structurallySound = flags.dateValid
      && flags.titleMinLength
      && flags.venueNonEmpty
      && flags.sourceUrlValid
      && flags.notWrongLocation;

    if (structurallySound && flags.dateFuture) {
      valid.push({ ...event, validationFlags: flags });
    } else if (structurallySound && !flags.dateFuture) {
      // Good data, just past date — don't penalize the source
      expired.push(event);
    } else {
      const failedChecks = Object.entries(flags)
        .filter(([, passed]) => !passed)
        .map(([name]) => name);
      console.log(
        `[validate] REJECTED "${event.title}" | venue="${event.venue}" | date="${event.date}" | failed: ${failedChecks.join(", ")}`
      );
      invalid.push(event);
    }
  }

  return { valid, expired, invalid };
}

// ============================================
// Validation rules
// ============================================

/** Check that date string is a valid ISO 8601 date (YYYY-MM-DD). */
function isValidIsoDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00`);
  return !isNaN(parsed.getTime());
}

/** Check that date is today or in the future. */
function isDateFuture(eventDate: string, todayIso: string): boolean {
  return eventDate >= todayIso;
}

/** Check that a string is a valid URL. */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if city name appears in the venue text.
 * Normalizes both strings: strips accents, lowercases, trims.
 */
function cityAppearsIn(normalizedCity: string, venue: string): boolean {
  const normalizedVenue = normalizeText(venue);
  return normalizedVenue.includes(normalizedCity);
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
  // Argentina doesn't use this format — Argentine codes are letter+4digits (e.g., X5000)
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
    "juderia",              // medieval Jewish quarter, unique to Córdoba Spain
    "montilla-moriles",     // wine region near Córdoba Spain
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
