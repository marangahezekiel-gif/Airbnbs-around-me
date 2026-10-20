import type { Place } from './types';

/** Client helper: search for places via our /api/geocode proxy. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal });
  if (!res.ok) throw new Error('Geocoding failed');
  const data = (await res.json()) as { places: Place[] };
  return data.places;
}
