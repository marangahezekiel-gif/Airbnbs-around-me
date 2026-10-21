/**
 * Apify adapter (real listings via a hosted Airbnb scraper "Actor").
 *
 * ⚠️  This is a working skeleton, NOT verified against a live Actor. Every
 * Actor has its own input and output schema, so you must adjust the two marked
 * functions — `buildInput()` and `normalize()` — to match the Actor you pick.
 * Run the Actor once in the Apify console, look at the dataset JSON, and map
 * those fields in `normalize()`.
 *
 * Also check Airbnb's Terms of Service and the Actor's own terms before using
 * scraped data commercially.
 *
 * Production note: a synchronous scrape can take 20–60 s. For real traffic,
 * scrape on a schedule into a database/KV store and have `search()` read from
 * there instead. The in-memory TTL cache below only helps on warm servers.
 */
import type { Listing, PropertyType, SearchParams } from '../types';
import type { ListingProvider } from './types';

const TOKEN = process.env.APIFY_TOKEN;
const ACTOR = process.env.APIFY_ACTOR_ID; // "username~actor-name" or the actor id

export const apifyConfigured = Boolean(TOKEN && ACTOR);

type Json = Record<string, any>;

const CACHE_TTL_MS = 15 * 60 * 1000;
const searchCache = new Map<string, { at: number; items: Listing[] }>();
const byId = new Map<string, Listing>();

/** Read the first defined value from a list of dotted paths. */
function get(obj: Json, paths: string[]): unknown {
  for (const p of paths) {
    const v = p.split('.').reduce<unknown>((acc, key) => (acc as Json | undefined)?.[key], obj);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

const num = (v: unknown, fallback = 0): number => {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
};

/** ── ADJUST ME ── turn our search params into the Actor's input JSON. */
function buildInput(p: SearchParams): Json {
  return {
    locationQueries: [p.locationQuery ?? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`],
    currency: 'USD',
    maxItems: 40,
    ...(p.minPrice ? { priceMin: p.minPrice } : {}),
    ...(p.maxPrice ? { priceMax: p.maxPrice } : {}),
  };
}

/** ── ADJUST ME ── map one raw dataset item to our Listing shape. */
function normalize(item: Json): Listing | null {
  const id = String(get(item, ['id', 'listingId', 'roomId', 'room_id']) ?? '');
  const lat = num(get(item, ['coordinates.latitude', 'location.lat', 'latitude', 'lat']), NaN);
  const lng = num(get(item, ['coordinates.longitude', 'location.lng', 'longitude', 'lng']), NaN);
  if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const roomType = String(get(item, ['roomType', 'room_type', 'propertyType']) ?? '').toLowerCase();
  const propertyType: PropertyType = roomType.includes('private') ? 'private_room' : 'entire_place';

  const rawPhotos = (get(item, ['images', 'photos', 'pictures']) as unknown[]) ?? [];
  const photos = rawPhotos
    .map((p) => (typeof p === 'string' ? p : String((p as Json)?.url ?? (p as Json)?.imageUrl ?? (p as Json)?.baseUrl ?? '')))
    .filter(Boolean);
  if (photos.length === 0) return null;

  return {
    id,
    title: String(get(item, ['name', 'title']) ?? 'Airbnb stay'),
    neighborhood: String(get(item, ['neighborhood', 'city', 'location.city']) ?? ''),
    propertyType,
    lat,
    lng,
    pricePerNight: num(get(item, ['price.unit.amount', 'price.amount', 'pricing.price', 'price'])),
    currency: String(get(item, ['price.unit.currency', 'price.currency', 'currency']) ?? 'USD'),
    rating: num(get(item, ['rating.guestSatisfaction', 'rating', 'stars', 'avgRating']), 0),
    reviewCount: num(get(item, ['rating.reviewsCount', 'reviewsCount', 'numberOfReviews']), 0),
    bedrooms: num(get(item, ['bedrooms', 'bedroomCount']), 0),
    beds: num(get(item, ['beds', 'bedCount']), 1),
    bathrooms: num(get(item, ['bathrooms', 'bathroomCount']), 1),
    maxGuests: num(get(item, ['guests', 'personCapacity', 'maxGuests']), 2),
    amenities: ((get(item, ['amenities']) as unknown[]) ?? []).map((a) => (typeof a === 'string' ? a : String((a as Json)?.title ?? (a as Json)?.name ?? ''))).filter(Boolean),
    instantBook: Boolean(get(item, ['instantBook', 'isInstantBookable'])),
    photos,
    host: {
      name: String(get(item, ['host.name', 'primaryHost.name']) ?? 'Host'),
      isSuperhost: Boolean(get(item, ['host.isSuperhost', 'isSuperhost'])),
      yearsHosting: num(get(item, ['host.yearsHosting']), 1),
    },
    description: String(get(item, ['description', 'summary']) ?? ''),
    reviews: [],
    airbnbUrl: String(get(item, ['url', 'listingUrl']) ?? `https://www.airbnb.com/rooms/${id}`),
  };
}

export const apifyProvider: ListingProvider = {
  name: 'apify',

  async search(params) {
    const key = [params.lat.toFixed(2), params.lng.toFixed(2), params.locationQuery ?? ''].join('|');
    const hit = searchCache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.items;

    const url = `https://api.apify.com/v2/acts/${encodeURIComponent(ACTOR as string)}/run-sync-get-dataset-items?timeout=55`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(buildInput(params)),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Apify request failed (${res.status})`);

    const raw = (await res.json()) as Json[];
    const items = raw.map(normalize).filter((l): l is Listing => l !== null);
    items.forEach((l) => byId.set(l.id, l));
    searchCache.set(key, { at: Date.now(), items });
    return items;
  },

  /**
   * Only works while the server instance still remembers a previous search.
   * TODO: for production, fetch the detail via the Actor, or read from a
   * persistent store (Vercel KV / Postgres) populated during search().
   */
  async getById(id) {
    return byId.get(id) ?? null;
  },
};
