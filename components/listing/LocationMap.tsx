'use client';

/**
 * Map for a listing's detail page: the exact pin, a "Get directions" button
 * (Google Maps) and an in-page route preview from the visitor's location
 * (Mapbox Directions). Without a Mapbox token the map is replaced by a
 * friendly note — the Google Maps button still works.
 *
 * mapbox-gl is imported inside the effect so nothing touches `window` on the server.
 */
import 'mapbox-gl/dist/mapbox-gl.css';
import type { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import { googleMapsDirectionsUrl } from '@/lib/directions';

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface Props {
  lat: number;
  lng: number;
  title: string;
  address?: string;
}

type Profile = 'driving' | 'walking';
interface RouteInfo {
  minutes: number;
  km: number;
}

export function LocationMap({ lat, lng, title, address }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const glRef = useRef<typeof import('mapbox-gl').default | null>(null);
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routing, setRouting] = useState<Profile | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    let cancelled = false;
    let map: MapboxMap | undefined;

    (async () => {
      const gl = (await import('mapbox-gl')).default;
      if (cancelled || !containerRef.current) return;
      gl.accessToken = TOKEN;
      glRef.current = gl;

      map = new gl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [lng, lat],
        zoom: 15,
        cooperativeGestures: true, // two-finger pan on phones so the page can still scroll
      });
      map.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');
      new gl.Marker({ color: '#FF5A4D' }).setLngLat([lng, lat]).setPopup(new gl.Popup({ offset: 24 }).setText(title)).addTo(map);
      map.on('load', () => !cancelled && setReady(true));
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [lat, lng, title]);

  async function showRoute(profile: Profile) {
    const map = mapRef.current;
    const gl = glRef.current;
    if (!map || !gl || !ready) return;
    setMessage(null);
    setRouting(profile);

    try {
      const origin = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!('geolocation' in navigator)) return reject(new Error('Your browser can’t share its location.'));
        navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Allow location access to see the route from where you are.')), {
          enableHighAccuracy: true,
          timeout: 10_000,
        });
      });
      const from: [number, number] = [origin.coords.longitude, origin.coords.latitude];

      const url =
        `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from[0]},${from[1]};${lng},${lat}` +
        `?geometries=geojson&overview=full&access_token=${TOKEN}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Could not get a route right now.');
      const data = (await res.json()) as { routes?: { duration: number; distance: number; geometry: GeoJSON.LineString }[] };
      const best = data.routes?.[0];
      if (!best) throw new Error('No route found between here and this place.');

      const feature: GeoJSON.Feature<GeoJSON.LineString> = { type: 'Feature', properties: {}, geometry: best.geometry };
      const source = map.getSource('route') as GeoJSONSource | undefined;
      if (source) source.setData(feature);
      else {
        map.addSource('route', { type: 'geojson', data: feature });
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#1F2328', 'line-width': 5 },
        });
        const dot = document.createElement('div');
        dot.className = 'user-dot';
        new gl.Marker({ element: dot }).setLngLat(from).addTo(map);
      }

      const bounds = new gl.LngLatBounds(from, from);
      best.geometry.coordinates.forEach((c) => bounds.extend(c as [number, number]));
      map.fitBounds(bounds, { padding: 56, duration: 800 });
      setRoute({ minutes: Math.max(1, Math.round(best.duration / 60)), km: best.distance / 1000 });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not get a route.');
    } finally {
      setRouting(null);
    }
  }

  const chip = 'rounded-full border border-charcoal-200 px-4 py-2 text-sm font-semibold transition hover:border-charcoal-900 disabled:opacity-60';

  return (
    <div>
      {TOKEN ? (
        <div className="relative h-80 overflow-hidden rounded-3xl border border-charcoal-100 sm:h-96">
          <div ref={containerRef} className="h-full w-full" />
        </div>
      ) : (
        <div className="rounded-3xl bg-sand-100 p-6 text-center">
          <p className="font-bold">Map needs a Mapbox token</p>
          <p className="mt-1 text-sm text-charcoal-500">
            Add <code className="rounded bg-charcoal-100 px-1.5 py-0.5">NEXT_PUBLIC_MAPBOX_TOKEN</code> to see the map here. Directions below still work.
          </p>
        </div>
      )}

      {address && <p className="mt-3 text-charcoal-600">{address}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={googleMapsDirectionsUrl({ lat, lng })}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-charcoal-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-charcoal-700 active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m3 11 18-8-8 18-2-8-8-2Z" />
          </svg>
          Get directions
        </a>
        {TOKEN && (
          <>
            <button type="button" className={chip} disabled={!ready || routing !== null} onClick={() => showRoute('driving')}>
              {routing === 'driving' ? 'Routing…' : 'Show drive here'}
            </button>
            <button type="button" className={chip} disabled={!ready || routing !== null} onClick={() => showRoute('walking')}>
              {routing === 'walking' ? 'Routing…' : 'Show walk here'}
            </button>
          </>
        )}
      </div>

      {route && (
        <p role="status" className="mt-3 text-sm font-semibold text-charcoal-700">
          {route.minutes} min · {route.km.toFixed(1)} km from where you are
        </p>
      )}
      {message && (
        <p role="alert" className="mt-3 text-sm font-semibold text-coral-700">
          {message}
        </p>
      )}
      <p className="mt-2 text-xs text-charcoal-400">Opens Google Maps with the exact coordinates the host set ({lat.toFixed(5)}, {lng.toFixed(5)}).</p>
    </div>
  );
}
