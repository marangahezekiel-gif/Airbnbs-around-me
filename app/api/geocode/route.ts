import { NextRequest, NextResponse } from 'next/server';
import type { Place } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * GET /api/geocode?q=Lisbon  →  { places: Place[] }
 * Uses Mapbox Geocoding when a token is set, otherwise falls back to the
 * public OpenStreetMap Nominatim service (fine for development; for production
 * traffic use Mapbox or your own geocoder — see Nominatim's usage policy).
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 120);
  if (q.length < 2) return NextResponse.json({ places: [] });

  try {
    const places = MAPBOX_TOKEN ? await mapbox(q) : await nominatim(q);
    return NextResponse.json(
      { places },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    );
  } catch (err) {
    console.error('[api/geocode]', err);
    return NextResponse.json({ places: [], error: 'Geocoding failed' }, { status: 502 });
  }
}

async function mapbox(q: string): Promise<Place[]> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${MAPBOX_TOKEN}&limit=5&autocomplete=true&types=place,locality,neighborhood,address,poi`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox geocoding ${res.status}`);
  const data = (await res.json()) as {
    features: { id: string; place_name: string; center: [number, number] }[];
  };
  return data.features.map((f) => ({
    id: f.id,
    name: f.place_name,
    lng: f.center[0],
    lat: f.center[1],
  }));
}

async function nominatim(q: string): Promise<Place[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AirbnbsAroundMe/1.0 (development geocoder)' },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = (await res.json()) as { place_id: number; display_name: string; lat: string; lon: string }[];
  return data.map((d) => ({
    id: String(d.place_id),
    name: d.display_name,
    lat: Number(d.lat),
    lng: Number(d.lon),
  }));
}
