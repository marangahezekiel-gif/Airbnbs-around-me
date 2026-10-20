import { NextRequest, NextResponse } from 'next/server';
import { isValidCoord } from '@/lib/geo';
import { searchListings } from '@/lib/listings';
import type { PropertyType, SearchParams } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // real scrapers can be slow

const num = (v: string | null): number | undefined => {
  if (v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * GET /api/listings?lat=&lng=&radius=&minPrice=&maxPrice=&type=&bedrooms=&amenities=&instant=&q=
 *  - type:       comma list of entire_place,private_room
 *  - amenities:  comma list (listing must have all)
 *  - instant:    "1" for instant-book only
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get('lat'));
  const lng = Number(sp.get('lng'));

  if (!isValidCoord(lat, lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const validTypes: PropertyType[] = ['entire_place', 'private_room'];
  const types = (sp.get('type') ?? '')
    .split(',')
    .filter((t): t is PropertyType => validTypes.includes(t as PropertyType));

  const params: SearchParams = {
    lat,
    lng,
    radiusKm: Math.min(50, Math.max(0.5, num(sp.get('radius')) ?? 10)),
    locationQuery: sp.get('q')?.slice(0, 120) || undefined,
    minPrice: num(sp.get('minPrice')),
    maxPrice: num(sp.get('maxPrice')),
    types: types.length ? types : undefined,
    minBedrooms: num(sp.get('bedrooms')),
    amenities: (sp.get('amenities') ?? '').split(',').map((a) => a.trim()).filter(Boolean).slice(0, 12),
    instantBook: sp.get('instant') === '1',
  };

  try {
    const result = await searchListings(params);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('[api/listings]', err);
    return NextResponse.json({ error: 'Could not load listings' }, { status: 502 });
  }
}
