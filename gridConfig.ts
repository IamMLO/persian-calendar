export const HOUR_HEIGHT = 64; // px per hour
export const PX_PER_MINUTE = HOUR_HEIGHT / 60;
export const SNAP_MINUTES = 15;
export const DAY_HEIGHT = HOUR_HEIGHT * 24;

export function snapMinutes(m: number): number {
  const snapped = Math.round(m / SNAP_MINUTES) * SNAP_MINUTES;
  return Math.min(Math.max(snapped, 0), 24 * 60 - SNAP_MINUTES);
}
