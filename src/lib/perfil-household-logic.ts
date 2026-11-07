import type { OccupationLevel } from "@/lib/validations/member";

/** §5.3 Perfil → Mi hogar — "Día del plan" sheet; planningDay matches 0=Sunday..6=Saturday. */
export const PLANNING_DAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

export function formatPlanningDayLabel(planningDay: number | null): string {
  if (planningDay === null) return "Sin día fijo";
  return PLANNING_DAY_LABELS[planningDay] ?? "Sin día fijo";
}

export interface HouseholdLocationSummary {
  city: string | null;
  country: string | null;
  timezone: string | null;
}

/** Country codes stored on Household (per onboarding's handleSelectCity) are AR-only today. */
const COUNTRY_NAMES: Record<string, string> = { AR: "Argentina" };

/** Row meta under "Ubicación", e.g. "Córdoba, Argentina". */
export function formatLocationLabel(location: HouseholdLocationSummary): string {
  const countryName = location.country ? COUNTRY_NAMES[location.country] ?? location.country : null;
  const parts = [location.city, countryName].filter((part): part is string => Boolean(part));
  if (parts.length > 0) return parts.join(", ");
  return location.timezone ?? "Sin configurar";
}

export interface OccupationLevelOption {
  value: OccupationLevel;
  label: string;
  description: string;
}

/** §5.3 Perfil → "Hábitos de la casa" — same three levels as the deleted OccupationLevelSelector. */
export const OCCUPATION_LEVELS: OccupationLevelOption[] = [
  { value: "BUSY", label: "Muy ocupado/a", description: "Poco tiempo en casa, preferís pocas tareas" },
  { value: "MODERATE", label: "Ocupado/a", description: "Disponibilidad moderada para tareas" },
  { value: "AVAILABLE", label: "Disponible", description: "Más tiempo en casa, podés asumir más tareas" },
];

/** Type guard so RadioGroup's plain string onChange can be assigned to OccupationLevel without an unvalidated cast. */
export function isOccupationLevel(value: string): value is OccupationLevel {
  return OCCUPATION_LEVELS.some((level) => level.value === value);
}
