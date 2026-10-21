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
  // Reverse lookup: /api/geocode?lat=..&lng=.. → the address under a dropped pin
  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lng = Number(req.nextUrl.searchParams.get('lng'));
  if (req.nextUrl.searchParams.has('lat') && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    try {
      return NextResponse.json({ places: await reverse(lat, lng) });
    } catch (err) {
      console.error('[api/geocode reverse]', err);
      return NextResponse.json({ places: [] });
    }
  }

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

async function reverse(lat: number, lng: number): Promise<Place[]> {
  if (MAPBOX_TOKEN) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1&types=address,poi,neighborhood,place`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Mapbox reverse ${res.status}`);
    const data = (await res.json()) as { features: { id: string; place_name: string; center: [number, number] }[] };
    return data.features.map((f) => ({ id: f.id, name: f.place_name, lng: f.center[0], lat: f.center[1] }));
  }
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'AirbnbsAroundMe/1.0 (development geocoder)' } });
  if (!res.ok) throw new Error(`Nominatim reverse ${res.status}`);
  const d = (await res.json()) as { place_id?: number; display_name?: string };
  return d.display_name ? [{ id: String(d.place_id ?? 'rev'), name: d.display_name, lat, lng }] : [];
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
