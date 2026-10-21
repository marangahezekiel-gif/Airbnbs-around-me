/**
 * Listing service: the single place the app (API routes + server pages)
 * calls to get listings. It asks the active provider for raw data, then
 * applies filters, distances and affiliate links in one consistent way.
 */
import { buildAffiliateUrl } from './affiliate';
import { haversineKm } from './geo';
import { getProvider, getProviderForId, marketplaceProvider } from './providers';
import type { LatLng, Listing, SearchParams } from './types';

export function applyFilters(items: Listing[], p: SearchParams): Listing[] {
  const centre: LatLng = { lat: p.lat, lng: p.lng };
  return items.filter((l) => {
    if (haversineKm(centre, l) > p.radiusKm) return false;
    if (p.minPrice != null && l.pricePerNight < p.minPrice) return false;
    if (p.maxPrice != null && l.pricePerNight > p.maxPrice) return false;
    if (p.types?.length && !p.types.includes(l.propertyType)) return false;
    if (p.minBedrooms != null && l.bedrooms < p.minBedrooms) return false;
    if (p.amenities?.length && !p.amenities.every((a) => l.amenities.includes(a))) return false;
    if (p.instantBook && !l.instantBook) return false;
    return true;
  });
}

function decorate(l: Listing, from?: LatLng): Listing {
  return {
    ...l,
    // Host-created listings are booked on this site, so they have no Airbnb link.
    affiliateUrl: l.source === 'host' ? undefined : buildAffiliateUrl(l.airbnbUrl),
    distanceKm: from ? haversineKm(from, l) : l.distanceKm,
  };
}

/**
 * Set INCLUDE_EXTERNAL_LISTINGS=false once you have enough hosts of your own
 * to show only bookable, host-created stays. Default: also show the external
 * source (mock data / Apify) so the map is never empty.
 */
const includeExternal = () => process.env.INCLUDE_EXTERNAL_LISTINGS !== 'false';

export async function searchListings(params: SearchParams) {
  const provider = getProvider();
  const [hosted, external] = await Promise.all([
    // A database hiccup must not take the whole map down: log it and carry on.
    marketplaceProvider.search(params).catch((err) => {
      console.error('[listings] marketplace unavailable', err);
      return [] as Listing[];
    }),
    includeExternal() ? provider.search(params) : Promise.resolve([] as Listing[]),
  ]);
  const centre: LatLng = { lat: params.lat, lng: params.lng };
  const listings = applyFilters([...hosted, ...external], params)
    .map((l) => decorate(l, centre))
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  return { source: includeExternal() ? provider.name : 'marketplace', listings };
}

export async function getListingById(id: string): Promise<Listing | null> {
  const l = await getProviderForId(id).getById(id);
  return l ? decorate(l) : null;
}
