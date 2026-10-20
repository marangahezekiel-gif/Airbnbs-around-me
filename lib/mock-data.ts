/**
 * Deterministic mock listings so the app works with zero API keys.
 *
 * Listings are generated around a centre point. The listing id encodes the
 * (rounded) centre + index — `m_<latE2>_<lngE2>_<i>` — so the detail page can
 * regenerate the exact same listing later without a database.
 *
 * To go live, implement a provider in lib/providers/ instead; nothing in the
 * UI depends on this file.
 */
import { bboxAround } from './geo';
import type { Listing, PropertyType, Review } from './types';

export const AMENITIES = [
  'Wifi',
  'Kitchen',
  'Free parking',
  'Air conditioning',
  'Washer',
  'Workspace',
  'Pool',
  'Hot tub',
  'Pets allowed',
  'Gym',
  'TV',
  'Heating',
  'Balcony',
] as const;

const ENTIRE_TITLES = [
  'Sunny loft near the old town',
  'Modern 2BR with skyline views',
  'Cozy garden studio',
  'Designer apartment with balcony',
  'Quiet cottage retreat',
  'Rooftop penthouse with terrace',
  'Bright minimalist flat',
  'Family townhouse with patio',
  'Charming flat steps from the market',
  'Light-filled artist’s apartment',
];
const ROOM_TITLES = [
  'Private room in a friendly home',
  'Cozy room with garden access',
  'Bright room near transit',
  'Quiet room in a shared flat',
  'Sunny room with private entrance',
];
const NEIGHBORHOODS = [
  'Old Town',
  'Riverside',
  'Market District',
  'Parkside',
  'Harbour Quarter',
  'Midtown',
  'Hillcrest',
  'Garden Row',
  'Arts District',
  'University Quarter',
];
const HOSTS = ['Amara', 'Daniel', 'Priya', 'Lucas', 'Naomi', 'Tomás', 'Mei', 'Omar', 'Sofia', 'Kofi', 'Elena', 'Jonas'];
const REVIEWERS = ['Ava', 'Noah', 'Liam', 'Zuri', 'Mateo', 'Ines', 'Hana', 'Felix', 'Chloe', 'Samir', 'Yara', 'Leo'];
const REVIEW_TEXTS = [
  'Exactly as described and spotless. Check-in was effortless and the location is perfect.',
  'Great host, quick replies, and a very comfortable bed. Would happily stay again.',
  'Loved the neighbourhood — cafés and transit within a few minutes’ walk.',
  'Quiet at night, bright in the morning. Everything we needed was here.',
  'Beautiful space with thoughtful touches. The kitchen was fully equipped.',
  'Good value for the area. Wifi was fast enough for working remotely.',
  'Host left a handy local guide. We felt at home straight away.',
];
const DESCRIPTION_INTROS = [
  'A calm, well-kept place to base yourself while you explore.',
  'Everything you need for a relaxed stay, with the best of the neighbourhood on your doorstep.',
  'Thoughtfully furnished and flooded with natural light.',
];
const DESCRIPTION_BODIES = [
  'You’ll find fresh linens, a well-stocked kitchen and plenty of storage. Cafés, groceries and public transport are all a short walk away.',
  'Self check-in makes arrival easy at any hour. Ask your host for their favourite local spots — they are always happy to share.',
];

// ───────────── small deterministic RNG helpers ─────────────
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(r: () => number, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];

function shuffled<T>(r: () => number, arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const round = (n: number, d: number) => Number(n.toFixed(d));

// ───────────── public API ─────────────
export const MOCK_COUNT = 36;
export const MOCK_SPREAD_KM = 10;

export function parseMockId(id: string): { latE2: number; lngE2: number; index: number } | null {
  const m = /^m_(-?\d+)_(-?\d+)_(\d+)$/.exec(id);
  if (!m) return null;
  return { latE2: Number(m[1]), lngE2: Number(m[2]), index: Number(m[3]) };
}

export function generateMockListings(center: { lat: number; lng: number }): Listing[] {
  const latE2 = Math.round(center.lat * 100);
  const lngE2 = Math.round(center.lng * 100);
  return Array.from({ length: MOCK_COUNT }, (_, i) => buildMockListing(latE2, lngE2, i));
}

export function buildMockListing(latE2: number, lngE2: number, index: number): Listing {
  const id = `m_${latE2}_${lngE2}_${index}`;
  const r = mulberry32(hashString(id));
  const baseLat = latE2 / 100;
  const baseLng = lngE2 / 100;

  // Uniform scatter inside a disc
  const dist = MOCK_SPREAD_KM * Math.sqrt(r());
  const ang = r() * 2 * Math.PI;
  const lat = round(baseLat + (dist * Math.cos(ang)) / 111.32, 5);
  const lng = round(baseLng + (dist * Math.sin(ang)) / (111.32 * Math.cos((baseLat * Math.PI) / 180)), 5);

  const entire = r() > 0.32;
  const propertyType: PropertyType = entire ? 'entire_place' : 'private_room';
  const bedrooms = entire ? Math.floor(r() * 4) : 1; // 0..3, 0 = studio
  const maxGuests = entire ? Math.max(2, bedrooms * 2 + Math.floor(r() * 2)) : 2;
  const price = entire
    ? Math.round((48 + r() * 110 + bedrooms * 38) / 1) // ~$48–$310
    : Math.round(24 + r() * 56); // ~$24–$80

  const rating = round(4.2 + r() * 0.78, 2);
  const reviewCount = 3 + Math.floor(r() * 420);
  const neighborhood = pick(r, NEIGHBORHOODS);

  const amenityCount = 5 + Math.floor(r() * 6);
  const amenities = Array.from(new Set(['Wifi', ...shuffled(r, AMENITIES).slice(0, amenityCount)]));

  const photos = Array.from({ length: 6 }, (_, n) => `https://picsum.photos/seed/aam-${id}-${n}/960/720`);

  const reviews: Review[] = Array.from({ length: Math.min(reviewCount, 6) }, (_, n) => {
    const monthsAgo = 1 + n * 2 + Math.floor(r() * 2);
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    return {
      id: `${id}_r${n}`,
      author: pick(r, REVIEWERS),
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
      rating: r() > 0.2 ? 5 : 4,
      text: pick(r, REVIEW_TEXTS),
    };
  });

  const box = bboxAround({ lat, lng }, 0.6);
  // Mock listings don't exist on Airbnb, so link to a map search around the pin.
  const airbnbUrl =
    'https://www.airbnb.com/s/homes?search_by_map=true&zoom=15' +
    `&ne_lat=${box.neLat.toFixed(5)}&ne_lng=${box.neLng.toFixed(5)}` +
    `&sw_lat=${box.swLat.toFixed(5)}&sw_lng=${box.swLng.toFixed(5)}`;

  return {
    id,
    title: entire ? pick(r, ENTIRE_TITLES) : pick(r, ROOM_TITLES),
    neighborhood,
    propertyType,
    lat,
    lng,
    pricePerNight: price,
    currency: 'USD',
    rating,
    reviewCount,
    bedrooms,
    beds: Math.max(1, bedrooms + (r() > 0.6 ? 1 : 0)),
    bathrooms: entire ? Math.max(1, Math.ceil(bedrooms / 2)) : 1,
    maxGuests,
    amenities,
    instantBook: r() > 0.45,
    photos,
    host: {
      name: pick(r, HOSTS),
      isSuperhost: r() > 0.7,
      yearsHosting: 1 + Math.floor(r() * 9),
    },
    description: `${pick(r, DESCRIPTION_INTROS)} Set in ${neighborhood}. ${pick(r, DESCRIPTION_BODIES)}`,
    reviews,
    airbnbUrl,
  };
}
