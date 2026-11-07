import { z } from "zod";

/**
 * `useHouseholdDetail`'s response type only declares the fields the rest of the
 * app already reads. These settings rows need a few more columns that the API
 * already returns on the same household row (city, timezone, planningDay) —
 * parsed here instead of widening that shared type with an unchecked cast.
 */
const householdSettingsSchema = z.object({
  city: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  planningDay: z.number().int().min(0).max(6).nullable().optional(),
});

export interface HouseholdSettingsSnapshot {
  city: string | null;
  timezone: string | null;
  planningDay: number | null;
}

const EMPTY_SNAPSHOT: HouseholdSettingsSnapshot = { city: null, timezone: null, planningDay: null };

export function parseHouseholdSettings(household: unknown): HouseholdSettingsSnapshot {
  const parsed = householdSettingsSchema.safeParse(household);
  if (!parsed.success) return EMPTY_SNAPSHOT;

  return {
    city: parsed.data.city ?? null,
    timezone: parsed.data.timezone ?? null,
    planningDay: parsed.data.planningDay ?? null,
  };
}
