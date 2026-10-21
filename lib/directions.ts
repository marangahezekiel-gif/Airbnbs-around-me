import type { LatLng } from './types';

export type TravelMode = 'driving' | 'walking' | 'transit' | 'bicycling';

/**
 * Google Maps directions to the exact coordinates. With no origin given,
 * Google starts from the user's current location (and asks permission on
 * desktop). On phones this opens the Google Maps app when it is installed.
 */
export function googleMapsDirectionsUrl(to: LatLng, mode: TravelMode = 'driving'): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${to.lat.toFixed(6)},${to.lng.toFixed(6)}&travelmode=${mode}`;
}
