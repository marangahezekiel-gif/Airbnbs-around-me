import type { LatLng, PropertyType } from './types';

export interface Filters {
  minPrice: number | null;
  maxPrice: number | null;
  types: PropertyType[];
  /** Minimum bedrooms (0 = any) */
  bedrooms: number;
  amenities: string[];
  instantBook: boolean;
  radiusKm: number;
}

export const DEFAULT_FILTERS: Filters = {
  minPrice: null,
  maxPrice: null,
  types: [],
  bedrooms: 0,
  amenities: [],
  instantBook: false,
  radiusKm: 10,
};

/** Number of filters that differ from the defaults (for the badge). */
export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.minPrice != null || f.maxPrice != null) n++;
  if (f.types.length) n++;
  if (f.bedrooms > 0) n++;
  if (f.amenities.length) n++;
  if (f.instantBook) n++;
  if (f.radiusKm !== DEFAULT_FILTERS.radiusKm) n++;
  return n;
}

/** Build the /api/listings query string. Coordinates are rounded (~100 m) so offline caching hits more often. */
export function buildListingsQuery(center: LatLng, f: Filters, placeName?: string): string {
  const p = new URLSearchParams({
    lat: center.lat.toFixed(3),
    lng: center.lng.toFixed(3),
    radius: String(f.radiusKm),
  });
  if (f.minPrice != null) p.set('minPrice', String(f.minPrice));
  if (f.maxPrice != null) p.set('maxPrice', String(f.maxPrice));
  if (f.types.length) p.set('type', f.types.join(','));
  if (f.bedrooms > 0) p.set('bedrooms', String(f.bedrooms));
  if (f.amenities.length) p.set('amenities', f.amenities.join(','));
  if (f.instantBook) p.set('instant', '1');
  if (placeName) p.set('q', placeName);
  return p.toString();
}
