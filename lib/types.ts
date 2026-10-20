/**
 * Shared domain types.
 *
 * `Listing` is the ONE shape the whole UI depends on. Any data source
 * (mock, Apify, an official API, your own database) just has to map its
 * output into this shape — see lib/providers/*.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export type PropertyType = 'entire_place' | 'private_room';

export interface Host {
  name: string;
  avatar?: string;
  isSuperhost: boolean;
  yearsHosting: number;
}

export interface Review {
  id: string;
  author: string;
  /** ISO date (yyyy-mm-dd) */
  date: string;
  rating: number;
  text: string;
}

export interface Listing {
  id: string;
  title: string;
  neighborhood: string;
  propertyType: PropertyType;
  lat: number;
  lng: number;
  /** Nightly price in `currency` */
  pricePerNight: number;
  /** ISO 4217 code, e.g. "USD" */
  currency: string;
  rating: number;
  reviewCount: number;
  /** 0 = studio */
  bedrooms: number;
  beds: number;
  bathrooms: number;
  maxGuests: number;
  amenities: string[];
  instantBook: boolean;
  photos: string[];
  host: Host;
  description: string;
  reviews: Review[];
  /** Optional ISO dates (yyyy-mm-dd) that are NOT bookable. */
  blockedDates?: string[];
  /** Plain Airbnb URL */
  airbnbUrl: string;
  /** Airbnb URL with your affiliate tracking applied (set server-side) */
  affiliateUrl?: string;
  /** Distance in km from the search centre (the client may recompute from the user) */
  distanceKm?: number;
}

export interface SearchParams {
  lat: number;
  lng: number;
  radiusKm: number;
  /** Free-text place name, if the user searched for one (helps scrapers) */
  locationQuery?: string;
  minPrice?: number;
  maxPrice?: number;
  types?: PropertyType[];
  minBedrooms?: number;
  /** Listing must have ALL of these */
  amenities?: string[];
  instantBook?: boolean;
}

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
}
