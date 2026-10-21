/**
 * Marketplace provider: turns host-created listings from the database into
 * the shared `Listing` shape, so they show up on the same map, cards and
 * filters as every other source.
 */
import type { ListingProvider } from '../providers/types';
import type { Listing } from '../types';
import { addDays, freeUnits, todayIso } from './availability';
import { getListing, getPublicProfiles, listAllListings, occupiedByListing } from './repo';
import type { HostListing, OccupiedRange, PublicProfile } from './types';

function yearsSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / (365.25 * 86_400_000)));
}

/** Map a stored host listing to the UI's Listing shape. */
export function toListing(rec: HostListing, host: PublicProfile | undefined, occupied: OccupiedRange[] = []): Listing {
  const tonight = todayIso();
  return {
    id: rec.id,
    source: 'host',
    title: rec.title,
    neighborhood: rec.neighborhood,
    propertyType: rec.propertyType,
    lat: rec.lat,
    lng: rec.lng,
    pricePerNight: rec.pricePerNight,
    currency: rec.currency,
    rating: 0,
    reviewCount: 0,
    bedrooms: rec.bedrooms,
    beds: rec.beds,
    bathrooms: rec.bathrooms,
    maxGuests: rec.maxGuests,
    amenities: rec.amenities,
    instantBook: rec.instantBook,
    photos: rec.photos,
    host: {
      id: rec.hostId,
      name: host?.name ?? 'Host',
      isSuperhost: false,
      yearsHosting: host ? yearsSince(host.createdAt) : 0,
    },
    description: rec.description,
    houseRules: rec.houseRules,
    address: rec.address,
    reviews: [],
    blockedDates: rec.blockedDates,
    airbnbUrl: '',
    unitsTotal: rec.units.length,
    unitsLeft: freeUnits(rec.units, occupied, tonight, addDays(tonight, 1)).length,
  };
}

/** Load listings (all, or one id) together with their hosts and current occupancy. */
async function hydrate(records: HostListing[]): Promise<Listing[]> {
  if (!records.length) return [];
  const [hosts, occupied] = await Promise.all([
    getPublicProfiles(records.map((r) => r.hostId)),
    occupiedByListing(records.map((r) => r.id)),
  ]);
  return records.map((r) => toListing(r, hosts.get(r.hostId), occupied.get(r.id)));
}

export const marketplaceProvider: ListingProvider = {
  name: 'marketplace',

  // Filtering by distance/price/etc. is done afterwards by lib/listings.ts.
  // For a very large catalogue, add a bounding-box filter here (see bboxAround in lib/geo.ts).
  async search() {
    return hydrate(await listAllListings());
  },

  async getById(id) {
    const rec = await getListing(id);
    return rec ? (await hydrate([rec]))[0] : null;
  },
};
