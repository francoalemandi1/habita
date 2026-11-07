import { z } from "zod";

/** ISO weekday keys: 1=Monday .. 7=Sunday. */
const WEEKDAY_KEYS = ["1", "2", "3", "4", "5", "6", "7"] as const;

export const availabilitySlotSchema = z.enum(["morning", "afternoon", "evening"]);

/**
 * Per-weekday available slots. An empty array for a weekday means the member
 * is unavailable that whole day. A missing weekday means "available always"
 * for that day (no restriction).
 */
export const availabilitySchema = z
  .record(z.string(), z.array(availabilitySlotSchema))
  .refine((value) => Object.keys(value).every((key) => (WEEKDAY_KEYS as readonly string[]).includes(key)), {
    message: "Las claves de disponibilidad deben ser días ISO (1=lunes..7=domingo)",
  });

export const quietHourValueSchema = z.number().int().min(0).max(23);

export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;
export type Availability = z.infer<typeof availabilitySchema>;
