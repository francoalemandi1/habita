/**
 * Availability grid helpers (handoff §5.3 Disponibilidad: 7 days × Mañana/Tarde/Noche).
 * Shape matches `availabilitySchema` in @habita/contracts: ISO weekday keys "1".."7";
 * a missing weekday (or a null grid) means available all day; `[]` means unavailable.
 */

export const AVAILABILITY_SLOTS = ["morning", "afternoon", "evening"] as const;
export type AvailabilityGridSlot = (typeof AVAILABILITY_SLOTS)[number];
export type AvailabilityGrid = Record<string, AvailabilityGridSlot[]>;

export const AVAILABILITY_SLOT_LABELS: Record<AvailabilityGridSlot, string> = {
  morning: "Mañana",
  afternoon: "Tarde",
  evening: "Noche",
};

/** ISO weekday (1 = lunes … 7 = domingo) with short Spanish labels, in display order. */
export const AVAILABILITY_WEEKDAYS = [
  { weekday: 1, label: "Lun" },
  { weekday: 2, label: "Mar" },
  { weekday: 3, label: "Mié" },
  { weekday: 4, label: "Jue" },
  { weekday: 5, label: "Vie" },
  { weekday: 6, label: "Sáb" },
  { weekday: 7, label: "Dom" },
] as const;

function slotsForDay(grid: AvailabilityGrid | null, weekday: number): AvailabilityGridSlot[] {
  const daySlots = grid?.[String(weekday)];
  return daySlots ?? [...AVAILABILITY_SLOTS];
}

export function isSlotAvailable(grid: AvailabilityGrid | null, weekday: number, slot: AvailabilityGridSlot): boolean {
  return slotsForDay(grid, weekday).includes(slot);
}

/** Returns a new grid with one cell flipped; never mutates the input. */
export function toggleAvailabilitySlot(
  grid: AvailabilityGrid | null,
  weekday: number,
  slot: AvailabilityGridSlot,
): AvailabilityGrid {
  const current = slotsForDay(grid, weekday);
  const next = current.includes(slot)
    ? current.filter((existing) => existing !== slot)
    : AVAILABILITY_SLOTS.filter((candidate) => candidate === slot || current.includes(candidate));
  return { ...(grid ?? {}), [String(weekday)]: next };
}

/** A fully available grid is stored as null so the planner treats it as "no restriction". */
export function normalizeAvailabilityGrid(grid: AvailabilityGrid): AvailabilityGrid | null {
  const isFullyAvailable = AVAILABILITY_WEEKDAYS.every(({ weekday }) =>
    AVAILABILITY_SLOTS.every((slot) => isSlotAvailable(grid, weekday, slot)),
  );
  return isFullyAvailable ? null : grid;
}
