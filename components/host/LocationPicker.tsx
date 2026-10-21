'use client';

/**
 * Exact-location picker for the listing form.
 *
 *  1. Search an address (same geocoder as the explore page) → the map jumps there.
 *  2. Tap the map or drag the coral pin to the exact entrance/building.
 *  3. The pin's coordinates are what guests see and navigate to.
 *
 * Uses the same MapView as the explore page. If there is no Mapbox token the
 * map shows its setup message, and the coordinate fields below still let a
 * host enter the position by hand.
 */
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapFocus } from '@/components/explore/MapView';
import { searchPlaces } from '@/lib/geocode';
import type { LatLng, Place } from '@/lib/types';

const MapView = dynamic(() => import('@/components/explore/MapView'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-sand-200" aria-hidden="true" />,
});

const DEFAULT_CENTER: LatLng = {
  lat: Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? 48.8566),
  lng: Number(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? 2.3522),
};

interface Props {
  address: string;
  position: LatLng | null;
  onAddress: (address: string, neighborhood?: string) => void;
  onPosition: (p: LatLng) => void;
}

const field = 'w-full rounded-2xl border border-charcoal-200 bg-white px-4 py-3 text-base outline-none transition focus:border-charcoal-900';

export function LocationPicker({ address, position, onAddress, onPosition }: Props) {
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [focus, setFocus] = useState<MapFocus | null>(position ? { ...position, key: 1, zoom: 16 } : null);
  const [status, setStatus] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  // Start equal to the saved address so editing an existing listing doesn't pop open a search list
  const lastQuery = useRef(address);

  const flyTo = useCallback((p: LatLng) => setFocus({ ...p, key: Date.now(), zoom: 16.5 }), []);

  // Debounced address autocomplete (only while the user is typing — not for programmatic changes)
  useEffect(() => {
    const q = address.trim();
    if (q.length < 4 || q === lastQuery.current) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchPlaces(q, ctrl.signal));
      } catch {
        /* aborted or offline */
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [address]);

  function choose(place: Place) {
    lastQuery.current = place.name;
    setResults([]);
    // "12 Rue X, Le Marais, Paris, France" → neighbourhood guess = the second part
    const parts = place.name.split(',').map((s) => s.trim());
    onAddress(place.name, parts.length > 2 ? parts[1] : undefined);
    onPosition({ lat: place.lat, lng: place.lng });
    flyTo({ lat: place.lat, lng: place.lng });
    setStatus('Pin placed. Drag it to the exact spot if needed.');
  }

  /** Called after the pin is dropped or dragged. */
  function moved(p: LatLng) {
    onPosition(p);
    setStatus(null);
  }

  async function useAddressFromPin() {
    if (!position) return;
    setStatus('Looking up the address…');
    try {
      const res = await fetch(`/api/geocode?lat=${position.lat}&lng=${position.lng}`);
      const data = (await res.json()) as { places: Place[] };
      if (data.places[0]) {
        lastQuery.current = data.places[0].name;
        onAddress(data.places[0].name);
        setStatus('Address updated from the pin.');
      } else setStatus('No address found at that spot.');
    } catch {
      setStatus('Could not look up the address.');
    }
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) return setStatus('Your browser can’t share its location.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onPosition(p);
        flyTo(p);
        setLocating(false);
        setStatus('Pin placed at your current location.');
      },
      () => {
        setLocating(false);
        setStatus('Location permission was denied.');
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const setCoord = (key: 'lat' | 'lng', raw: string) => {
    const n = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(n)) return;
    const next = { lat: position?.lat ?? DEFAULT_CENTER.lat, lng: position?.lng ?? DEFAULT_CENTER.lng, [key]: n };
    if (Math.abs(next.lat) <= 90 && Math.abs(next.lng) <= 180) {
      onPosition(next);
      flyTo(next);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <label htmlFor="address" className="mb-1.5 block text-sm font-bold">
          Address
        </label>
        <input
          id="address"
          className={field}
          value={address}
          onChange={(e) => {
            lastQuery.current = '';
            onAddress(e.target.value);
          }}
          placeholder="Start typing the street address…"
          autoComplete="off"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="address-results"
        />
        {(results.length > 0 || searching) && (
          <ul id="address-results" role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-charcoal-100 bg-white shadow-float">
            {searching && results.length === 0 && <li className="px-4 py-3 text-sm text-charcoal-500">Searching…</li>}
            {results.map((p) => (
              <li key={p.id} role="option" aria-selected="false">
                <button type="button" onClick={() => choose(p)} className="block w-full px-4 py-3 text-left text-sm hover:bg-charcoal-50">
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative h-80 overflow-hidden rounded-3xl border border-charcoal-100 sm:h-96">
        <MapView initialCenter={position ?? DEFAULT_CENTER} focus={focus} draggablePin={{ position, onChange: moved }} />
        {!position && (
          <p className="pointer-events-none absolute inset-x-4 top-4 rounded-2xl bg-charcoal-900/90 px-4 py-2.5 text-center text-sm font-semibold text-white">
            Search an address, or tap the map to drop the pin.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={useMyLocation} disabled={locating} className="rounded-full border border-charcoal-200 px-4 py-2 text-sm font-semibold transition hover:border-charcoal-900 disabled:opacity-60">
          {locating ? 'Locating…' : 'Use my current location'}
        </button>
        <button type="button" onClick={useAddressFromPin} disabled={!position} className="rounded-full border border-charcoal-200 px-4 py-2 text-sm font-semibold transition hover:border-charcoal-900 disabled:opacity-40">
          Use the pin’s address
        </button>
        {status && (
          <p role="status" className="text-sm text-charcoal-500">
            {status}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold">Latitude</span>
          <input
            className={field}
            inputMode="decimal"
            value={position ? position.lat.toFixed(6) : ''}
            onChange={(e) => setCoord('lat', e.target.value)}
            placeholder="e.g. 48.856600"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold">Longitude</span>
          <input
            className={field}
            inputMode="decimal"
            value={position ? position.lng.toFixed(6) : ''}
            onChange={(e) => setCoord('lng', e.target.value)}
            placeholder="e.g. 2.352200"
          />
        </label>
      </div>
    </div>
  );
}
