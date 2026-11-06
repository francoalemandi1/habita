/** §5.3 Perfil → Avisos — "No molestar" defaults and copy. */
export const DEFAULT_QUIET_HOURS_START = 23;
export const DEFAULT_QUIET_HOURS_END = 8;

export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);

export function quietHoursLabel(start: number, end: number): string {
  return `No molestar de ${start} a ${end} h`;
}

export interface QuietHoursValue {
  start: number | null;
  end: number | null;
}

/** Turning the toggle on seeds the handoff defaults (23 → 8); off clears both. */
export function toggleQuietHours(enabled: boolean): QuietHoursValue {
  return enabled
    ? { start: DEFAULT_QUIET_HOURS_START, end: DEFAULT_QUIET_HOURS_END }
    : { start: null, end: null };
}

export function isValidQuietHoursRange(start: number, end: number): boolean {
  return start !== end;
}
