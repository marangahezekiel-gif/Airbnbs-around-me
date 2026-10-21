/** Domain types for the two-sided marketplace (hosts create listings, guests request bookings). */

export type Role = 'host' | 'guest';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  /** ISO timestamp */
  createdAt: string;
}

/** A profile that is safe to send to a browser. */
export type PublicProfile = Omit<Profile, 'passwordHash' | 'email'>;

/** One physical rentable unit inside a listing ("Unit 1", "Unit 2", …). */
export interface Unit {
  id: string;
  listingId: string;
  label: string;
}

export interface HostListing {
  id: string;
  hostId: string;
  title: string;
  description: string;
  pricePerNight: number;
  currency: string;
  propertyType: 'entire_place' | 'private_room';
  bedrooms: number;
  beds: number;
  bathrooms: number;
  maxGuests: number;
  amenities: string[];
  houseRules: string;
  photos: string[];
  address: string;
  neighborhood: string;
  /** Exact coordinates, set by dragging the pin */
  lat: number;
  lng: number;
  instantBook: boolean;
  /** yyyy-mm-dd dates the host has closed manually */
  blockedDates: string[];
  createdAt: string;
  updatedAt: string;
  units: Unit[];
}

export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface Booking {
  id: string;
  listingId: string;
  /** Assigned when the booking is accepted */
  unitId: string | null;
  guestId: string;
  guestName: string;
  guestEmail: string;
  /** yyyy-mm-dd */
  checkIn: string;
  /** yyyy-mm-dd, the guest leaves this morning (the night itself is not booked) */
  checkOut: string;
  guests: number;
  note: string;
  nights: number;
  totalPrice: number;
  currency: string;
  status: BookingStatus;
  createdAt: string;
  decidedAt: string | null;
}

/** What the public listing page may know about someone else's booking: nothing personal. */
export interface OccupiedRange {
  unitId: string;
  checkIn: string;
  checkOut: string;
}
