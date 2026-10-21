/**
 * Pure date + availability helpers. No Node or database imports, so the same
 * code runs on the server (to enforce rules) and in the browser (to show
 * "2 of 3 units left" instantly).
 *
 * Dates are plain "yyyy-mm-dd" strings and all maths is done in UTC, so
 * time zones and daylight saving can never shift a night by one.
 */
import type { OccupiedRange, Unit } from './types';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const DAY_MS = 86_400_000;
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function isValidDate(d: string): boolean {
  return DATE_RE.test(d) && toIso(toMs(d)) === d;
}

export const addDays = (d: string, n: number) => toIso(toMs(d) + n * DAY_MS);
export const nightsBetween = (checkIn: string, checkOut: string) => Math.round((toMs(checkOut) - toMs(checkIn)) / DAY_MS);

/** Today as yyyy-mm-dd in UTC (good enough for "is this date in the past"). */
export const todayIso = () => toIso(Date.now());

/** Every booked night: [checkIn, checkOut). */
export function eachNight(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) out.push(d);
  return out;
}

const overlaps = (r: { checkIn: string; checkOut: string }, checkIn: string, checkOut: string) =>
  r.checkIn < checkOut && r.checkOut > checkIn;

/** Units with no accepted booking overlapping [checkIn, checkOut). */
export function freeUnits(units: Unit[], occupied: OccupiedRange[], checkIn: string, checkOut: string): Unit[] {
  const busy = new Set(occupied.filter((r) => overlaps(r, checkIn, checkOut)).map((r) => r.unitId));
  return units.filter((u) => !busy.has(u.id));
}

/** Dates (from today on) on which every unit is taken. Used to grey out the calendar. */
export function fullyBookedDates(units: Unit[], occupied: OccupiedRange[]): string[] {
  if (!units.length) return [];
  const today = todayIso();
  const perDay = new Map<string, Set<string>>();
  for (const r of occupied) {
    for (const night of eachNight(r.checkIn < today ? today : r.checkIn, r.checkOut)) {
      if (!perDay.has(night)) perDay.set(night, new Set());
      perDay.get(night)!.add(r.unitId);
    }
  }
  return [...perDay.entries()].filter(([, ids]) => ids.size >= units.length).map(([d]) => d);
}

/** Does the stay include any night the host has closed? */
export const hitsBlockedDate = (blocked: string[], checkIn: string, checkOut: string) => {
  const set = new Set(blocked);
  return eachNight(checkIn, checkOut).some((n) => set.has(n));
};
