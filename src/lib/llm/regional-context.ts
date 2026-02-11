/**
 * Builds a regional context block for AI prompts based on household location.
 * Adapts language variant, tone, timezone, season, and weather.
 */

import { getWeatherForecast } from "@/lib/weather";

import type { WeatherForecast } from "@/lib/weather";

export interface RegionalContext {
  /** Markdown block to inject into AI prompts. Empty string if no location. */
  promptBlock: string;
  /** Local time in household timezone (falls back to server time). */
  localNow: Date;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  localHour: number;
  localDayOfWeek: number;
  isWeekend: boolean;
}

interface HouseholdLocation {
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  country?: string | null;
  city?: string | null;
}

const DAY_NAMES_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const MONTH_NAMES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * Map of ISO country codes to Spanish language variant instructions.
 */
const LANGUAGE_VARIANT_MAP: Record<string, string> = {
  AR: "español rioplatense argentino (voseo, lunfardo suave, tono cercano)",
  UY: "español rioplatense uruguayo (voseo, tono cercano)",
  CL: "español chileno (voseo chileno, modismos locales)",
  MX: "español mexicano (tuteo, modismos mexicanos, tono cálido)",
  CO: "español colombiano (tuteo/ustedeo según contexto, tono amable)",
  PE: "español peruano (tuteo, tono respetuoso)",
  VE: "español venezolano (tuteo, tono expresivo)",
  EC: "español ecuatoriano (ustedeo, tono respetuoso)",
  BO: "español boliviano (voseo/ustedeo, tono respetuoso)",
  PY: "español paraguayo (voseo, influencia guaraní suave)",
  CR: "español costarricense (ustedeo, tono amigable)",
  PA: "español panameño (tuteo/voseo, tono relajado)",
  DO: "español dominicano (tuteo, tono expresivo)",
  CU: "español cubano (tuteo, tono directo)",
  GT: "español guatemalteco (voseo, tono respetuoso)",
  HN: "español hondureño (voseo, tono amable)",
  SV: "español salvadoreño (voseo, tono cercano)",
  NI: "español nicaragüense (voseo, tono coloquial)",
  PR: "español puertorriqueño (tuteo, tono expresivo)",
  ES: "español peninsular de España (tuteo, vosotros, tono directo)",
  US: "español neutro latinoamericano (tuteo, tono neutral)",
};

/**
 * Build the full regional context for a household.
 * If no location data exists, returns an empty promptBlock and server-based time.
 */
export async function buildRegionalContext(
  household: HouseholdLocation
): Promise<RegionalContext> {
  const timezone = household.timezone ?? undefined;
  const now = new Date();

  // Compute local time using Intl
  const localHour = getLocalHour(now, timezone);
  const localDayOfWeek = getLocalDayOfWeek(now, timezone);
  const localMonth = getLocalMonth(now, timezone);
  const isWeekend = localDayOfWeek === 0 || localDayOfWeek === 6;
  const timeOfDay = computeTimeOfDay(localHour);

  // No location data at all → return empty context
  if (!household.timezone && !household.country && !household.city) {
    return {
      promptBlock: "",
      localNow: now,
      timeOfDay,
      localHour,
      localDayOfWeek,
      isWeekend,
    };
  }

  // Build prompt block sections
  const sections: string[] = [];

  // Location info
  sections.push("## Contexto regional del hogar");
  const locationParts: string[] = [];
  if (household.city) locationParts.push(household.city);
  if (household.country) locationParts.push(household.country);
  if (locationParts.length > 0) {
    sections.push(`- Ubicación: ${locationParts.join(", ")}`);
  }
  if (household.timezone) {
    sections.push(`- Zona horaria: ${household.timezone}`);
  }

  // Local time with full date
  const dayName = DAY_NAMES_ES[localDayOfWeek] ?? "hoy";
  const localDay = getLocalDay(now, timezone);
  const monthName = MONTH_NAMES_ES[localMonth] ?? "";
  const localYear = getLocalYear(now, timezone);
  sections.push(`- Fecha actual: ${dayName} ${localDay} de ${monthName} de ${localYear}`);
  sections.push(`- Hora local: ${String(localHour).padStart(2, "0")}:00`);

  // Season
  const season = getSeason(localMonth, household.latitude);
  if (season) {
    sections.push(`- Estación: ${season}`);
  }

  // Language variant
  const variant = getLanguageVariant(household.country);
  if (variant) {
    sections.push(`- Variante de español: ${variant}`);
    sections.push(`- IMPORTANTE: Usá el tono y vocabulario de ${variant}. Adaptá expresiones, modismos y recompensas a la cultura local.`);
  }

  // Weather (only if we have coordinates)
  const weather = await getWeatherForecast(household.latitude, household.longitude);
  if (weather) {
    sections.push("");
    sections.push("## Clima");
    sections.push(formatWeatherLine("Hoy", weather.today));
    sections.push(formatWeatherLine("Mañana", weather.tomorrow));
    sections.push("- Considerá el clima al sugerir tareas (ej: si llueve mañana, tender ropa hoy; si hace frío, sugerir platos calientes)");
  }

  return {
    promptBlock: sections.join("\n"),
    localNow: now,
    timeOfDay,
    localHour,
    localDayOfWeek,
    isWeekend,
  };
}

function formatWeatherLine(
  label: string,
  day: WeatherForecast["today"]
): string {
  return `- ${label}: ${day.weatherDescription}, ${Math.round(day.temperatureMin)}°C - ${Math.round(day.temperatureMax)}°C, probabilidad de lluvia ${day.precipitationProbability}%`;
}

function getLocalHour(now: Date, timezone?: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    });
    return parseInt(formatter.format(now), 10);
  } catch {
    return now.getHours();
  }
}

export function getLocalDayOfWeek(now: Date, timezone?: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: timezone,
    });
    const dayStr = formatter.format(now);
    const dayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    return dayMap[dayStr] ?? now.getDay();
  } catch {
    return now.getDay();
  }
}

function getLocalDay(now: Date, timezone?: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      timeZone: timezone,
    });
    return parseInt(formatter.format(now), 10);
  } catch {
    return now.getDate();
  }
}

function getLocalYear(now: Date, timezone?: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      timeZone: timezone,
    });
    return parseInt(formatter.format(now), 10);
  } catch {
    return now.getFullYear();
  }
}

function getLocalMonth(now: Date, timezone?: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      timeZone: timezone,
    });
    return parseInt(formatter.format(now), 10) - 1; // 0-indexed
  } catch {
    return now.getMonth();
  }
}

function computeTimeOfDay(hour: number): "morning" | "afternoon" | "evening" | "night" {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

/**
 * Determine season based on month and hemisphere.
 * Southern hemisphere (latitude < 0) has inverted seasons.
 */
function getSeason(month: number, latitude?: number | null): string | null {
  const isSouthern = (latitude ?? 0) < 0;
  const monthName = MONTH_NAMES_ES[month];

  // Northern hemisphere seasons
  let season: string;
  if (month >= 2 && month <= 4) season = "primavera";
  else if (month >= 5 && month <= 7) season = "verano";
  else if (month >= 8 && month <= 10) season = "otoño";
  else season = "invierno";

  // Invert for southern hemisphere
  if (isSouthern) {
    const inversion: Record<string, string> = {
      primavera: "otoño",
      verano: "invierno",
      otoño: "primavera",
      invierno: "verano",
    };
    season = inversion[season] ?? season;
  }

  return monthName ? `${season} (${monthName})` : season;
}

function getLanguageVariant(country?: string | null): string | null {
  if (!country) return null;
  return LANGUAGE_VARIANT_MAP[country.toUpperCase()] ?? null;
}
