/**
 * Marketplace repository: all reads/writes of profiles, listings, units and
 * bookings. Works with any storage driver (lib/db) — rows are mapped to and
 * from the domain types here, and the booking rules live here too.
 *
 * Server-only (uses node:crypto and the database).
 */
import { randomUUID } from 'node:crypto';
import { getDriver, type Row } from '../db';
import { addDays, freeUnits, hitsBlockedDate, isValidDate, nightsBetween, todayIso } from './availability';
import type { BookingRequest, ListingInput } from './schemas';
import type { Booking, BookingStatus, HostListing, OccupiedRange, Profile, PublicProfile, Role, Unit } from './types';

const db = () => getDriver();
const newId = (prefix: string) => `${prefix}_${randomUUID()}`;
const nowIso = () => new Date().toISOString();

// ───────────────────────── row mapping ─────────────────────────
function parseJson<T>(value: unknown, fallback: T): T {
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

const toProfile = (r: Row): Profile => ({
  id: String(r.id),
  email: String(r.email),
  name: String(r.name),
  role: r.role === 'host' ? 'host' : 'guest',
  passwordHash: String(r.passwordHash),
  createdAt: String(r.createdAt),
});

export const toPublicProfile = (p: Profile): PublicProfile => ({
  id: p.id,
  name: p.name,
  role: p.role,
  createdAt: p.createdAt,
});

const toUnit = (r: Row): Unit => ({ id: String(r.id), listingId: String(r.listingId), label: String(r.label) });

const toListing = (r: Row, units: Unit[]): HostListing => ({
  id: String(r.id),
  hostId: String(r.hostId),
  title: String(r.title),
  description: String(r.description),
  pricePerNight: Number(r.pricePerNight),
  currency: String(r.currency),
  propertyType: r.propertyType === 'private_room' ? 'private_room' : 'entire_place',
  bedrooms: Number(r.bedrooms),
  beds: Number(r.beds),
  bathrooms: Number(r.bathrooms),
  maxGuests: Number(r.maxGuests),
  amenities: parseJson<string[]>(r.amenities, []),
  houseRules: String(r.houseRules ?? ''),
  photos: parseJson<string[]>(r.photos, []),
  address: String(r.address),
  neighborhood: String(r.neighborhood ?? ''),
  lat: Number(r.lat),
  lng: Number(r.lng),
  instantBook: Boolean(r.instantBook),
  blockedDates: parseJson<string[]>(r.blockedDates, []),
  createdAt: String(r.createdAt),
  updatedAt: String(r.updatedAt),
  units: units.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })),
});

function listingFields(input: ListingInput): Row {
  return {
    title: input.title,
    description: input.description,
    pricePerNight: input.pricePerNight,
    currency: input.currency,
    propertyType: input.propertyType,
    bedrooms: input.bedrooms,
    beds: input.beds,
    bathrooms: input.bathrooms,
    maxGuests: input.maxGuests,
    amenities: JSON.stringify(input.amenities),
    houseRules: input.houseRules,
    photos: JSON.stringify(input.photos),
    address: input.address,
    neighborhood: input.neighborhood,
    lat: input.lat,
    lng: input.lng,
    instantBook: input.instantBook,
    blockedDates: JSON.stringify([...new Set(input.blockedDates)].sort()),
  };
}

const toBooking = (r: Row): Booking => ({
  id: String(r.id),
  listingId: String(r.listingId),
  unitId: r.unitId ? String(r.unitId) : null,
  guestId: String(r.guestId),
  guestName: String(r.guestName),
  guestEmail: String(r.guestEmail),
  checkIn: String(r.checkIn),
  checkOut: String(r.checkOut),
  guests: Number(r.guests),
  note: String(r.note ?? ''),
  nights: Number(r.nights),
  totalPrice: Number(r.totalPrice),
  currency: String(r.currency),
  status: r.status as BookingStatus,
  createdAt: String(r.createdAt),
  decidedAt: r.decidedAt ? String(r.decidedAt) : null,
});

// ───────────────────────── profiles ─────────────────────────
export async function createProfile(p: { email: string; name: string; role: Role; passwordHash: string }): Promise<Profile> {
  const row: Row = { id: newId('u'), ...p, createdAt: nowIso() };
  await db().insert('profiles', row);
  return toProfile(row);
}

export async function getProfileByEmail(email: string): Promise<Profile | null> {
  const [r] = await db().select('profiles', { email: email.trim().toLowerCase() });
  return r ? toProfile(r) : null;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const [r] = await db().select('profiles', { id });
  return r ? toProfile(r) : null;
}

export async function getPublicProfiles(ids: string[]): Promise<Map<string, PublicProfile>> {
  const rows = await db().selectIn('profiles', 'id', [...new Set(ids)]);
  return new Map(rows.map((r) => [String(r.id), toPublicProfile(toProfile(r))]));
}

export async function setProfileRole(id: string, role: Role): Promise<boolean> {
  return db().update('profiles', id, { role });
}

// ───────────────────────── listings ─────────────────────────
async function attachUnits(rows: Row[]): Promise<HostListing[]> {
  if (!rows.length) return [];
  const unitRows = await db().selectIn('units', 'listingId', rows.map((r) => String(r.id)));
  const byListing = new Map<string, Unit[]>();
  for (const u of unitRows.map(toUnit)) byListing.set(u.listingId, [...(byListing.get(u.listingId) ?? []), u]);
  return rows.map((r) => toListing(r, byListing.get(String(r.id)) ?? []));
}

export async function listAllListings(): Promise<HostListing[]> {
  return attachUnits(await db().select('listings'));
}

export async function listListingsByHost(hostId: string): Promise<HostListing[]> {
  const list = await attachUnits(await db().select('listings', { hostId }));
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getListing(id: string): Promise<HostListing | null> {
  const rows = await db().select('listings', { id });
  return (await attachUnits(rows))[0] ?? null;
}

export async function getListingsByIds(ids: string[]): Promise<HostListing[]> {
  return attachUnits(await db().selectIn('listings', 'id', [...new Set(ids)]));
}

/** Make the listing have exactly `count` units. Throws UNITS_IN_USE if booked units would have to go. */
async function syncUnits(listingId: string, count: number): Promise<void> {
  const current = (await db().select('units', { listingId })).map(toUnit);
  current.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  for (let i = current.length; i < count; i++) {
    await db().insert('units', { id: newId('un'), listingId, label: `Unit ${i + 1}` });
  }

  const surplus = current.length - count;
  if (surplus > 0) {
    const today = todayIso();
    const active = (await db().select('bookings', { listingId, status: 'accepted' })).map(toBooking).filter((b) => b.checkOut >= today);
    const inUse = new Set(active.map((b) => b.unitId));
    // remove from the end, but never a unit that still has a stay on it
    const removable = [...current].reverse().filter((u) => !inUse.has(u.id)).slice(0, surplus);
    if (removable.length < surplus) throw new Error('UNITS_IN_USE');
    for (const u of removable) await db().remove('units', { id: u.id });
  }
}

export async function createListing(hostId: string, input: ListingInput): Promise<HostListing> {
  const id = newId('h');
  const now = nowIso();
  await db().insert('listings', { id, hostId, ...listingFields(input), createdAt: now, updatedAt: now });
  await syncUnits(id, input.unitCount);
  return (await getListing(id))!;
}

export async function updateListing(id: string, input: ListingInput): Promise<HostListing | null> {
  // Resize units first: if booked units would be removed this throws before anything else changes.
  await syncUnits(id, input.unitCount);
  const ok = await db().update('listings', id, { ...listingFields(input), updatedAt: nowIso() });
  return ok ? getListing(id) : null;
}

export async function deleteListing(id: string): Promise<void> {
  await db().remove('bookings', { listingId: id });
  await db().remove('units', { listingId: id });
  await db().remove('listings', { id });
}

// ───────────────────────── bookings ─────────────────────────
export async function getBooking(id: string): Promise<Booking | null> {
  const [r] = await db().select('bookings', { id });
  return r ? toBooking(r) : null;
}

export async function listBookingsForListings(listingIds: string[]): Promise<Booking[]> {
  const rows = await db().selectIn('bookings', 'listingId', listingIds);
  return rows.map(toBooking).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listBookingsByGuest(guestId: string): Promise<Booking[]> {
  const rows = await db().select('bookings', { guestId });
  return rows.map(toBooking).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Accepted, not-yet-finished stays, grouped by listing. Contains no personal data. */
export async function occupiedByListing(listingIds: string[]): Promise<Map<string, OccupiedRange[]>> {
  const today = todayIso();
  const rows = await db().selectIn('bookings', 'listingId', listingIds);
  const map = new Map<string, OccupiedRange[]>();
  for (const b of rows.map(toBooking)) {
    if (b.status !== 'accepted' || !b.unitId || b.checkOut < today) continue;
    map.set(b.listingId, [...(map.get(b.listingId) ?? []), { unitId: b.unitId, checkIn: b.checkIn, checkOut: b.checkOut }]);
  }
  return map;
}

// Booking rules read-then-write, so they run one at a time inside this process.
// (With several server instances use a database transaction/constraint instead.)
let chain: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string; status: number };
const fail = (error: string, status = 400): { ok: false; error: string; status: number } => ({ ok: false, error, status });

export function createBooking(guest: { id: string; name: string; email: string }, req: BookingRequest): Promise<Result<Booking>> {
  return serialize(async () => {
    const today = todayIso();
    if (!isValidDate(req.checkIn) || !isValidDate(req.checkOut)) return fail('Choose valid dates');
    // one day of slack: the guest's local "today" can be a day behind or ahead of UTC
    if (req.checkIn < addDays(today, -1)) return fail('Check-in can’t be in the past');
    if (req.checkOut <= req.checkIn) return fail('Check-out must be after check-in');
    const nights = nightsBetween(req.checkIn, req.checkOut);
    if (nights > 30) return fail('Stays are limited to 30 nights');

    const listing = await getListing(req.listingId);
    if (!listing) return fail('This listing no longer exists', 404);
    if (listing.hostId === guest.id) return fail('You can’t book your own listing', 403);
    if (req.guests > listing.maxGuests) return fail(`This place sleeps up to ${listing.maxGuests} guests`);
    if (hitsBlockedDate(listing.blockedDates, req.checkIn, req.checkOut)) return fail('The host is not available on some of those dates', 409);

    const occupied = (await occupiedByListing([listing.id])).get(listing.id) ?? [];
    const free = freeUnits(listing.units, occupied, req.checkIn, req.checkOut);
    if (!free.length) return fail('No units left for those dates', 409);

    const instant = listing.instantBook;
    const row: Row = {
      id: newId('b'),
      listingId: listing.id,
      unitId: instant ? free[0].id : null,
      guestId: guest.id,
      guestName: guest.name,
      guestEmail: guest.email,
      checkIn: req.checkIn,
      checkOut: req.checkOut,
      guests: req.guests,
      note: req.note,
      nights,
      totalPrice: Math.round(nights * listing.pricePerNight * 100) / 100,
      currency: listing.currency,
      status: instant ? 'accepted' : 'pending',
      createdAt: nowIso(),
      decidedAt: instant ? nowIso() : null,
    };
    await db().insert('bookings', row);
    return { ok: true, value: toBooking(row) };
  });
}

export function decideBooking(bookingId: string, hostId: string, action: 'accept' | 'reject'): Promise<Result<Booking>> {
  return serialize(async () => {
    const booking = await getBooking(bookingId);
    if (!booking) return fail('Booking not found', 404);
    const listing = await getListing(booking.listingId);
    if (!listing || listing.hostId !== hostId) return fail('Not your listing', 403);
    if (booking.status !== 'pending') return fail('This request has already been handled', 409);

    if (action === 'reject') {
      await db().update('bookings', booking.id, { status: 'rejected', decidedAt: nowIso() });
      return { ok: true, value: { ...booking, status: 'rejected', decidedAt: nowIso() } };
    }

    // Accept: needs a unit that is still free for these dates (others may have been accepted since).
    const occupied = (await occupiedByListing([listing.id])).get(listing.id) ?? [];
    const free = freeUnits(listing.units, occupied, booking.checkIn, booking.checkOut);
    if (!free.length) return fail('No unit is free for those dates any more — reject this request instead', 409);
    if (hitsBlockedDate(listing.blockedDates, booking.checkIn, booking.checkOut)) return fail('You have blocked some of these dates', 409);

    const decidedAt = nowIso();
    await db().update('bookings', booking.id, { status: 'accepted', unitId: free[0].id, decidedAt });
    return { ok: true, value: { ...booking, status: 'accepted', unitId: free[0].id, decidedAt } };
  });
}

export function cancelBooking(bookingId: string, guestId: string): Promise<Result<Booking>> {
  return serialize(async () => {
    const booking = await getBooking(bookingId);
    if (!booking || booking.guestId !== guestId) return fail('Booking not found', 404);
    if (booking.status !== 'pending' && booking.status !== 'accepted') return fail('This booking can’t be cancelled', 409);
    await db().update('bookings', booking.id, { status: 'cancelled', decidedAt: nowIso() });
    return { ok: true, value: { ...booking, status: 'cancelled' } };
  });
}
